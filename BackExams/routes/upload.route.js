/* eslint-disable consistent-return */
import express from 'express';
import multiparty from 'multiparty';
import UploadService from '../services/upload.services.js';

const router = express.Router();

const uploadService = new UploadService();

router.get('/', async (req, res, next) => {
  res.send('This works - File loader');
});

router.post('/', async (req, res, next) => {
  try {
    const form = new multiparty.Form();
    form.parse(req, async (err, fields, { files }) => {
      const results = await Promise.allSettled(
        files.map((file) => uploadService.insertCSV(file)),
      );
      res.status(201).json(results);
    });
  } catch (e) {
    return res.status(500).json(e);
  }
});

export default router;
