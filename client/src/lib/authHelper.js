import jwt from 'jsonwebtoken';
import User from '../models/User';
import connectDB from './db';

export async function verifyAuth(request) {
  await connectDB();
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authentication token required', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'kiryana_smart_khata_secure_jwt_secret_2026_x9281';

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return { error: 'Invalid user session', status: 401 };
    }
    return { user };
  } catch (err) {
    return { error: 'Unauthorized: Session expired', status: 401 };
  }
}
