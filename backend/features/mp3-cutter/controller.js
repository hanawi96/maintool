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
  
  static async cutByFileId(req, res) {
    try { success(res, await MP3Service.cutAudioByFileId(req.fileId, req.cutParams), 'Audio cut successfully'); }
    catch (e) { fail(res, e); }
  }
  
  static async changeSpeedByFileId(req, res) {
    try { success(res, await MP3Service.changeSpeedByFileId(req.fileId, req.speedParams), 'Audio speed changed successfully'); }
    catch (e) { fail(res, e); }
  }
  
  static async waveform(req, res) {
    try { success(res, await MP3Service.generateWaveform(req.file, req.audioInfo, req.waveformParams), 'Waveform generated successfully'); }
    catch (e) { fail(res, e); }
  }
  
  static async download(req, res) {
    try { await MP3Service.downloadFile(req.params.filename, res); }
    catch (e) { fail(res, e); }
  }
  
  static async healthCheck(req, res) {
    try { success(res, await MP3Service.getHealthStatus(), 'Service is healthy'); }
    catch (e) { fail(res, e); }
  }
  
  static async getSupportedFormats(req, res) {
    try { success(res, await MP3Service.getSupportedFormats(), 'Supported formats retrieved'); }
    catch (e) { fail(res, e); }
  }
  
  static async getStats(req, res) {
    try { success(res, await MP3Service.getStats(), 'Statistics retrieved'); }
    catch (e) { fail(res, e); }
  }
  
  static async debugFiles(req, res) {
    try { success(res, await MP3Service.debugFiles(), 'Debug information retrieved'); }
    catch (e) { fail(res, e); }
  }
}
