import { Router, type Router as ExpressRouter } from 'express';

export const posAppVersionRouter: ExpressRouter = Router();

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=in.iotsoft.smartpos';

// Public, unauthenticated -- the pos app checks this before login even
// happens, so it needs to be reachable without a session. The developer
// bumps POS_LATEST_VERSION_CODE/NAME on the server after each Play Store
// release; no app redeploy needed for the check itself to start firing.
posAppVersionRouter.get('/api/v1/pos/version', (_request, response) => {
  response.status(200).json({
    latestVersionCode: Number(process.env.POS_LATEST_VERSION_CODE ?? 6),
    latestVersionName: process.env.POS_LATEST_VERSION_NAME ?? '1.0',
    playStoreUrl: PLAY_STORE_URL
  });
});
