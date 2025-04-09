import { Connection, ConnectionConfig } from "@solana/web3.js";
import { getRpcEndpoints } from "../config/env";

// Timeout for connection attempts (in ms)
const CONNECTION_TIMEOUT = 10000;

// Connection configuration
const CONNECTION_CONFIG: ConnectionConfig = {
  commitment: "confirmed",
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 60000,
};

class ConnectionService {
  private static instance: ConnectionService;
  private connection: Connection | null = null;
  private currentEndpoint: string | null = null;
  private endpointIndex = 0;
  private endpoints: string[] = [];

  private constructor() {
    this.refreshEndpoints();
  }

  public static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  private refreshEndpoints() {
    const { primary, fallbacks } = getRpcEndpoints();
    this.endpoints = [primary, ...fallbacks];
    this.endpointIndex = 0;
  }

  public getConnection(): Connection {
    if (!this.connection) {
      this.initializeConnection();
    }
    return this.connection!;
  }

  public getCurrentEndpoint(): string {
    return this.currentEndpoint || "";
  }

  private initializeConnection() {
    if (this.endpoints.length === 0) {
      this.refreshEndpoints();
    }

    this.currentEndpoint = this.endpoints[this.endpointIndex];
    console.log(`Connecting to Solana RPC: ${this.currentEndpoint}`);
    this.connection = new Connection(this.currentEndpoint!, CONNECTION_CONFIG);
  }

  public async validateConnection(): Promise<boolean> {
    try {
      if (!this.connection) {
        this.initializeConnection();
      }

      // Simple check to validate the connection
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(
          () => reject(new Error("Connection timeout")),
          CONNECTION_TIMEOUT
        );
      });

      const connectionPromise = this.connection!.getVersion();
      await Promise.race([connectionPromise, timeoutPromise]);

      return true;
    } catch (error) {
      console.error("Connection validation failed:", error);
      return this.switchToFallback();
    }
  }

  private switchToFallback(): boolean {
    if (this.endpointIndex < this.endpoints.length - 1) {
      this.endpointIndex++;
      this.initializeConnection();
      console.log(`Switched to fallback RPC: ${this.currentEndpoint}`);
      return true;
    } else {
      console.error("All RPC endpoints failed");
      // Reset to primary for next attempt
      this.endpointIndex = 0;
      this.initializeConnection();
      return false;
    }
  }

  // For manual endpoint switching or refreshing
  public async switchEndpoint(): Promise<boolean> {
    return this.switchToFallback();
  }
}

export default ConnectionService;
