/**
 * Supabase Auth Middleware
 *
 * This middleware validates JWT tokens from Supabase Auth and attaches the user
 * object to the request for use in downstream route handlers.
 *
 * NOTE: This requires @supabase/supabase-js to be installed:
 * npm install @supabase/supabase-js
 *
 * Environment variables required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Supabase client placeholder
 * Uncomment after installing @supabase/supabase-js
 *
 * import { createClient } from '@supabase/supabase-js';
 *
 * const supabaseUrl = process.env.SUPABASE_URL;
 * const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
 *
 * if (!supabaseUrl || !supabaseAnonKey) {
 *   throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set');
 * }
 *
 * const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
 */

/**
 * Extends Express Request to include user property
 */
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email?: string;
      [key: string]: any;
    };
  }
}

/**
 * Supabase authentication middleware
 *
 * Extracts the JWT token from the Authorization header, validates it with Supabase,
 * and attaches the user object to req.user. Returns 401 if authentication fails.
 *
 * Usage:
 *   import { supabaseAuthMiddleware } from './middleware/supabase-auth';
 *   app.use('/api/v1/editor', supabaseAuthMiddleware, editorRouter);
 */
export const supabaseAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    /* TODO: Uncomment after installing @supabase/supabase-js
    // Validate token with Supabase
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        error: 'Invalid or expired token',
        details: error?.message
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: data.user.id,
      email: data.user.email,
      // Add other user properties as needed
      ...data.user.user_metadata
    };
    */

    // TEMPORARY: Mock user for testing (remove after Supabase integration)
    req.user = {
      id: 'mock-user-id',
      email: 'mock@example.com'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Optional authentication middleware
 *
 * Similar to supabaseAuthMiddleware but doesn't return 401 if authentication fails.
 * Instead, it continues without attaching req.user. Useful for routes that work
 * both authenticated and unauthenticated.
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without user
      next();
      return;
    }

    const token = authHeader.substring(7);

    /* TODO: Uncomment after installing @supabase/supabase-js
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (!error && data.user) {
      req.user = {
        id: data.user.id,
        email: data.user.email,
        ...data.user.user_metadata
      };
    }
    */

    // TEMPORARY: Mock user for testing
    req.user = {
      id: 'mock-user-id',
      email: 'mock@example.com'
    };

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue even if auth fails
    next();
  }
};
