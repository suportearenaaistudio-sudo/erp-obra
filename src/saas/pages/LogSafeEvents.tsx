
import React, { useState, useEffect } from 'react';
import { LogSafeEventsService, LogSafeEvent } from '../logsafe/logsafe.service';
import { Search, Clock, Shield, Globe, User } from 'lucide-react';

export const LogSafeEvents: React.FC = () => {
    const [events, setEvents] = useState<LogSafeEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Debounce search would be better, direct call for now
        const timer = setTimeout(() => loadEvents(), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            // Simple implementation: search by eventType if term provided
            const filters = searchTerm ? { eventType: searchTerm } : {};
            const { events } = await LogSafeEventsService.search(filters);
            setEvents(events || []);
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Investigação de Eventos</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Busque e analise logs de segurança brutos.
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Filtrar por tipo de evento..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Filtros Avançados
                </button>
            </div>

            {/* Events List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Carregando eventos...</div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Nenhum evento encontrado.</div>
                    ) : (
                        events.map((event) => (
                            <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-blue-50 p-2 rounded-lg">
                                            <Shield className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900">{event.event_type}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(event.created_at).toLocaleString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {event.actor_type}
                                                </span>
                                                {event.ip_hash && (
                                                    <span className="flex items-center gap-1" title={event.ip_hash}>
                                                        <Globe className="w-3 h-3" />
                                                        IP Hash: {event.ip_hash.substring(0, 8)}...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {event.metadata_json && (
                                        <div className="text-xs font-mono text-gray-500 bg-gray-50 p-2 rounded max-w-xs overflow-hidden">
                                            {JSON.stringify(event.metadata_json).substring(0, 100)}
                                            {JSON.stringify(event.metadata_json).length > 100 ? '...' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
