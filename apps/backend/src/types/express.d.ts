declare global {
  namespace Express {
    interface Request {
      /** Set by requestId middleware before any route handler runs. */
      id: string;
    }
  }
}

export {};
