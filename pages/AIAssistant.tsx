import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles } from 'lucide-react';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  actions?: string[];
}

export const AIAssistant = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      sender: 'ai', 
      text: 'Olá! Sou seu assistente Obra360. Posso ajudar a gerar recibos, consultar estoques ou analisar gastos. O que você precisa hoje?',
      actions: ['Gerar Recibo', 'Consultar Cimento', 'Ver Pendências']
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simulate AI Response (Mock Logic)
    setTimeout(() => {
      let aiText = "Desculpe, não entendi. Tente perguntar sobre estoque ou financeiro.";
      const lowerInput = input.toLowerCase();

      if (lowerInput.includes('cimento') || lowerInput.includes('estoque')) {
        aiText = "Verifiquei o estoque: O Cimento CP II está com 32 sacos. O nível mínimo é 50. Recomendo comprar 18 sacos imediatamente.";
      } else if (lowerInput.includes('gasto') || lowerInput.includes('financeiro')) {
        aiText = "Neste mês, o total de contas a pagar pendentes é R$ 12.000,00. A maior despesa é com a 'Empreiteira Silva'.";
      } else if (lowerInput.includes('recibo')) {
        aiText = "Certo, vou gerar um recibo para o lançamento. Por favor, confirme o valor e o beneficiário.";
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiText }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-slate-50 p-4 border-b border-gray-200 flex items-center gap-3">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg text-white">
          <Bot size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Obra360 AI Co-pilot</h3>
          <p className="text-xs text-slate-500">IA assistiva com guardrails ativos</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-slate-800 border border-gray-100 rounded-bl-none'
            }`}>
              {msg.sender === 'ai' && (
                <div className="flex items-center gap-1 mb-1 text-xs font-bold text-indigo-500">
                  <Sparkles size={12} /> IA Suggestion
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.text}</p>
              
              {msg.actions && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.actions.map(action => (
                    <button 
                      key={action}
                      onClick={() => setInput(action)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Digite sua pergunta ou comando..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
