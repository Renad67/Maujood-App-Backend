import { Router } from 'express';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware';
import { UserRole } from '../../DB/models/User.model';
import { validate } from '../../middleware/validation.middleware';
import { createOfferSchema, updateOfferSchema, addCommentSchema } from './offer.validation';
import { uploadMedia } from '../../utils/cloud.util';
import * as offerService from './offer.service';

const router = Router();

router.get('/', offerService.getFeedOffers);
router.get('/reels', offerService.getReelsFeed);
router.get('/:id', offerService.getOfferById);

router.post(
  '/',
  authenticate,
  authorizeRoles(UserRole.BUSINESS),
  uploadMedia.single('image'),
  validate(createOfferSchema),
  offerService.createOffer
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(UserRole.BUSINESS),
  uploadMedia.single('image'),
  validate(updateOfferSchema),
  offerService.updateOffer
);

router.post('/:id/like', authenticate, offerService.toggleLikeOffer);
router.post('/:id/save', authenticate, offerService.toggleSaveOffer);
router.get('/:id/comments', offerService.getOfferComments);
router.post('/:id/comments', authenticate, validate(addCommentSchema), offerService.addOfferComment);
router.delete('/:id/comments/:commentId', authenticate, offerService.deleteOfferComment);
router.post('/:id/claim', authenticate, authorizeRoles(UserRole.CUSTOMER), offerService.claimOffer);

export default router;
