import jwt from 'jsonwebtoken';

const DEFAULT_EXPIRY = '7d';

export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT secret is not configured. Please set JWT_SECRET in the environment.');
  }

  const configuredExpiry = process.env.JWT_EXPIRE ? process.env.JWT_EXPIRE.trim() : '';
  const expiresIn = configuredExpiry || DEFAULT_EXPIRY;

  try {
    return jwt.sign({ userId }, secret, { expiresIn });
  } catch (error) {
    if (error?.message?.includes('expiresIn')) {
      console.warn(`Invalid JWT_EXPIRE value "${configuredExpiry}". Falling back to ${DEFAULT_EXPIRY}.`);
      return jwt.sign({ userId }, secret, { expiresIn: DEFAULT_EXPIRY });
    }

    throw error;
  }
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

