import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { topUpSchema } from './wallet.validation';
import * as walletService from './wallet.service';

const router = Router();

router.get('/', authenticate, walletService.getMyWallet);
router.post('/top-up', authenticate, validate(topUpSchema), walletService.createTopUpCheckout);

export default router;

