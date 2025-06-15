// features/mp3-cutter/controller.js

import { MP3Service } from './service.js';
import { MP3_CONFIG } from './constants.js';
import { MP3Utils } from './utils.js';

function success(res, data, message = '', extra = {}) {
  res.json({ success: true, message, data, ...extra, timestamp: new Date().toISOString() });
}
function fail(res, error, code = 500, extra = {}) {
  res.status(code).json({ success: false, error: error.message || error, ...extra, timestamp: new Date().toISOString() });
}

export class MP3Controller {
  static async upload(req, res) {
    try { success(res, await MP3Service.processUpload(req.file, req.audioInfo), 'Audio file uploaded successfully'); }
    catch (e) { fail(res, e); }
  }
  static async cut(req, res) {
    try { success(res, await MP3Service.cutAudio(req.file, req.audioInfo, req.cutParams), 'Audio cut successfully'); }
    catch (e) { fail(res, e); }
  }
  // ...Các method còn lại tương tự
}
