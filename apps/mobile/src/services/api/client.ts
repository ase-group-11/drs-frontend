import axios from 'axios';
import {apiBaseUrl, apiTimeoutMs} from '../../config/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: apiTimeoutMs,
});

apiClient.interceptors.response.use(
  response => response,
  error => Promise.reject(error),
);