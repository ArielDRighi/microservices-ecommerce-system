import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response } from 'express';
import { config } from '../config';
import { logger } from '../logger';

// Orders Service Proxy Configuration
export const ordersProxyOptions: Options = {
  target: config.services.orders.url,
  changeOrigin: true,
  timeout: config.proxy.timeout,
  proxyTimeout: config.proxy.timeout,
  onProxyReq: (_proxyReq, req: Request) => {
    logger.info(`[Proxy] Forwarding ${req.method} ${req.url} to Orders Service`);
  },
  onProxyRes: (proxyRes, req: Request) => {
    logger.info(
      `[Proxy] Received response from Orders Service: ${proxyRes.statusCode} for ${req.method} ${req.url}`,
    );
  },
  onError: (err: Error, req: Request, res: Response) => {
    logger.error(`[Proxy] Error proxying to Orders Service:`, {
      error: err.message,
      method: req.method,
      url: req.url,
    });

    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Orders Service is temporarily unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  },
};

// Inventory Service Proxy Configuration
export const inventoryProxyOptions: Options = {
  target: config.services.inventory.url,
  changeOrigin: true,
  timeout: config.proxy.timeout,
  proxyTimeout: config.proxy.timeout,
  onProxyReq: (_proxyReq, req: Request) => {
    logger.info(`[Proxy] Forwarding ${req.method} ${req.url} to Inventory Service`);
  },
  onProxyRes: (proxyRes, req: Request) => {
    logger.info(
      `[Proxy] Received response from Inventory Service: ${proxyRes.statusCode} for ${req.method} ${req.url}`,
    );
  },
  onError: (err: Error, req: Request, res: Response) => {
    logger.error(`[Proxy] Error proxying to Inventory Service:`, {
      error: err.message,
      method: req.method,
      url: req.url,
    });

    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Inventory Service is temporarily unavailable',
        timestamp: new Date().toISOString(),
      });
    }
  },
};

// Create proxy middlewares
export const ordersProxy = createProxyMiddleware(ordersProxyOptions);
export const inventoryProxy = createProxyMiddleware(inventoryProxyOptions);
