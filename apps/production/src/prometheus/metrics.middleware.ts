import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric('http_requests_total') private readonly httpRequestsTotal: Counter<string>,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      this.httpRequestsTotal.inc({
        method: req.method,
        path: req.route ? req.route.path : req.path,
        status: res.statusCode.toString(), // Ensure status is a string
      });
    });
    next();
  }
}
