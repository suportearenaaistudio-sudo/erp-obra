/**
 * Example Value Object
 * 
 * Value objects are immutable and defined by their values, not identity.
 * Examples: Email, Money, Address, DateRange
 */

export class Email {
    private readonly value: string;

    private constructor(email: string) {
        this.value = email;
    }

    static create(email: string): Email | null {
        if (!this.isValid(email)) {
            return null;
        }
        return new Email(email.toLowerCase().trim());
    }

    static isValid(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    toString(): string {
        return this.value;
    }

    equals(other: Email): boolean {
        return this.value === other.value;
    }
}

export class Money {
    private readonly amount: number;
    private readonly currency: string;

    private constructor(amount: number, currency: string = 'BRL') {
        this.amount = amount;
        this.currency = currency;
    }

    static create(amount: number, currency: string = 'BRL'): Money | null {
        if (amount < 0 || !Number.isFinite(amount)) {
            return null;
        }
        return new Money(Math.round(amount * 100) / 100, currency);
    }

    getAmount(): number {
        return this.amount;
    }

    getCurrency(): string {
        return this.currency;
    }

    add(other: Money): Money | null {
        if (this.currency !== other.currency) {
            return null; // Can't add different currencies
        }
        return Money.create(this.amount + other.amount, this.currency);
    }

    toString(): string {
        return `${this.currency} ${this.amount.toFixed(2)}`;
    }
}
