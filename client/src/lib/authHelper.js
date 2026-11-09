import jwt from 'jsonwebtoken';
import connectDB from './db';

export async function verifyAuth(request) {
  // Ensure pooled DB connection is ready
  await connectDB();

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authentication token required', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'kiryana_smart_khata_secure_jwt_secret_2026_x9281';

  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded || !decoded.userId) {
      return { error: 'Invalid user session', status: 401 };
    }
    // High-performance: verified cryptographic token provides user context without blocking DB query
    return {
      user: {
        _id: decoded.userId,
        id: decoded.userId,
        username: decoded.username || 'admin',
        role: decoded.role || 'owner',
      },
    };
  } catch (err) {
    return { error: 'Unauthorized: Session expired', status: 401 };
  }
}
