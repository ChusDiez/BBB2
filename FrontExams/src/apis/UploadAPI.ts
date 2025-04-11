/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UploadClient } from './configs/axiosConfig';

const UploadAPI = {
  async uploadFiles(files: File[]) {
    const formData = new FormData();
    [...files].forEach((file) => {
      formData.append('files', file);
    });
    const headers = { 'Content-Type': 'multipart/form-data' };
    const { data } = await UploadClient.post(
      '',
      formData,
      { headers },
    );
    return data;
  },
};

export default UploadAPI;
