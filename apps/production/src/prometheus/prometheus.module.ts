import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'http_project_requests_total',
      help: 'Total number of HTTP requests for PROJECT',
      labelNames: ['method', 'path', 'status'], // !!!!!!!!!!!!!!!!!
    }),
  ],
  exports: [
    PrometheusModule,
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'], // Ensure this is also exported with labels !!!!!!!!!!!!!!!!!
    }),
  ],
})
export class CustomPrometheusModule {}
