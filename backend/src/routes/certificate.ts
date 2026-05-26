import express from "express";
import {
  issueCertificate,
  getCertificateByStudentId,
  getAllCertificates,
  deleteCertificate,
} from "../controllers/certificate.ts";
import { protect, authorize } from "../middleware/auth.ts";

const certificateRouter = express.Router();

certificateRouter.post(
  "/issue",
  protect,
  authorize(["admin"]),
  issueCertificate
);

certificateRouter.get(
  "/student/:studentId",
  protect,
  getCertificateByStudentId
);

certificateRouter.get(
  "/",
  protect,
  authorize(["admin"]),
  getAllCertificates
);

certificateRouter.delete(
  "/:id",
  protect,
  authorize(["admin"]),
  deleteCertificate
);

export default certificateRouter;
