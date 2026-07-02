import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerProvider {
  private readonly logs: string[] = [];

  log(message: string) {
    this.logs.push(message);
    this.printAllLogs(message);
  }

  printAllLogs(message: string) {
    console.log(message, this.logs);
  }
}
