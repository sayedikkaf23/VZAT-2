import { Router } from 'express';
import activeServicesController from '../Controllers/ActiveServicesController.js';

const router = Router();

/**
 * @route GET /api/customer/active-services
 * @desc Get all active services (payment schedules) for a customer
 * @access Customer Portal
 * @query customerEmail - Customer's email address
 */
router.get('/active-services', activeServicesController.getActiveServices);

/**
 * @route GET /api/customer/service-details/:quotepaymentId
 * @desc Get detailed information for a specific service
 * @access Customer Portal
 * @param quotepaymentId - The quote payment ID
 * @query customerEmail - Customer's email address (for verification)
 */
router.get('/service-details/:quotepaymentId', activeServicesController.getServiceDetails);

export default router;
