export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export class CreateTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateTransactionError";
  }
}

export class QuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateTransactionError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateTransactionError";
  }
}
