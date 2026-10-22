import mongoose from 'mongoose';
import { Integration } from '../models/Integration';
import { notConnected, invalidConfig } from './errors';

/**
 * Loads and decrypts the stored credentials for a user's connected app.
 * Result must never be logged.
 */
export const getCredentials = async (
  userId: string | mongoose.Types.ObjectId,
  appId: string
): Promise<Record<string, any>> => {
  const integration = await Integration.findOne({ userId, appId, connected: true });
  if (!integration) throw notConnected(appId);

  let data: Record<string, any>;
  try {
    data = integration.getAuthData();
  } catch {
    // Wrong key / tampered ciphertext. Don't surface crypto details.
    throw invalidConfig(appId, `Stored ${appId} credentials could not be decrypted. Reconnect the app.`);
  }
  if (!data || Object.keys(data).length === 0) throw notConnected(appId);
  return data;
};

/** Persists updated credentials (e.g. a rotated token) through the encrypting pre-save hook. */
export const saveCredentials = async (
  userId: string | mongoose.Types.ObjectId,
  appId: string,
  authData: Record<string, any>
): Promise<void> => {
  const integration = await Integration.findOne({ userId, appId });
  if (!integration) return;
  integration.authData = authData;
  integration.markModified('authData');
  await integration.save();
};
