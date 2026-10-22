import fastify, { type FastifyInstance } from 'fastify';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './shared/errors.js';
import { connectToDatabase, closeDatabase } from './shared/db.js';
import { healthModule } from './modules/health/index.js';

/**
 * Builds and configures the Fastify application instance.
 * Registers global error handling and module routes.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Attach global error and 404 handlers for uniform API error responses
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Register modules
  await app.register(healthModule);

  return app;
}

/**
 * Main application bootstrap function.
 * Builds and starts the Fastify app, connects to MongoDB, and logs a startup message.
 */
async function startServer(): Promise<void> {
  let isDbConnected = false;

  try {
    // 1. Connect to MongoDB once on server start
    console.log('Connecting to MongoDB Atlas...');
    try {
      await connectToDatabase(env.MONGODB_URI);
      isDbConnected = true;
      console.log('Connected to MongoDB Atlas successfully.');
    } catch (dbError) {
      console.error('⚠️  MongoDB Connection Notice:');
      console.error('   ', dbError instanceof Error ? dbError.message : dbError);
      console.error('   (Continuing server start so health check endpoints remain available)');
    }

    // 2. Build Fastify application
    const app = await buildApp();

    // 3. Start listening for incoming HTTP requests
    await app.listen({ port: env.PORT, host: '0.0.0.0' });

    // 4. Log clear startup message
    console.log('\n====================================================');
    console.log('  Ki-Khobor X Hornbill - Backend Server Started');
    console.log(`  Environment : ${env.NODE_ENV}`);
    console.log(`  Local URL   : http://localhost:${env.PORT}`);
    console.log(`  Health Check: http://localhost:${env.PORT}/health`);
    console.log(`  Database    : ${isDbConnected ? 'Connected (MongoDB Atlas)' : 'Disconnected (verify credentials in .env)'}`);
    console.log('====================================================\n');

    // 5. Graceful shutdown on termination signals
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\nReceived ${signal}. Gracefully shutting down...`);
        try {
          await app.close();
          await closeDatabase();
          console.log('Server and database connections closed cleanly.');
          process.exit(0);
        } catch (shutdownErr) {
          console.error('Error during shutdown:', shutdownErr);
          process.exit(1);
        }
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Start the server
startServer();
