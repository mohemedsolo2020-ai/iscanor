import { Request, Response, NextFunction } from 'express';
// Import our types to extend Express Request interface
import './types';

// Firebase Admin SDK setup would go here, but for development we'll use a simpler approach
// In production, you'd use: import { initializeApp, getApps, getApp } from 'firebase-admin/app';
// import { getAuth } from 'firebase-admin/auth';

// For development, we'll implement a basic token verification
export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "يجب تسجيل الدخول للوصول لهذه الخدمة" });
    }

    const idToken = authHeader.substring(7); // Remove "Bearer " prefix
    
    // In development, we'll do basic token parsing
    // In production, you'd use: const decodedToken = await getAuth().verifyIdToken(idToken);
    
    // For now, let's decode the JWT payload to get user info
    try {
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      
      // Attach user info to request
      req.user = {
        uid: payload.user_id || payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
      
      next();
    } catch (decodeError) {
      console.warn('فشل في فك ترميز رمز Firebase في بيئة التطوير. تحقق من إعداد Firebase من جانب العميل.');
      return res.status(401).json({ message: "رمز المصادقة غير صحيح" });
    }
    
  } catch (error) {
    console.error('خطأ في التحقق من رمز Firebase:', error);
    res.status(401).json({ message: "فشل في التحقق من المصادقة" });
  }
}

// Optional auth middleware - doesn't require authentication but adds user if present
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    // Only process auth header if it exists and has valid Bearer token
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 10) {
      const idToken = authHeader.substring(7);
      
      // Only process if token looks valid (has JWT structure)
      if (idToken && idToken.includes('.')) {
        try {
          const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
          
          // Only set user if payload has valid user data
          if (payload && (payload.user_id || payload.sub || payload.email)) {
            req.user = {
              uid: payload.user_id || payload.sub,
              email: payload.email,
              name: payload.name,
              picture: payload.picture
            };
          }
        } catch (error) {
          // Silently ignore errors in optional auth - continue without user
          console.debug('تم تجاهل رمز المصادقة غير الصالح');
        }
      }
    }
    
    // Always continue, even if authentication failed
    next();
  } catch (error) {
    // Always continue without authentication
    next();
  }
}