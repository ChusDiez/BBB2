/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState } from 'react';
import UploadAPI from '../apis/UploadAPI';

export default function useUploadFiles() {
  const [files, setFiles] = useState<Array<any>>([]);
  const [result, setResult] = useState<any>();

  const submitFiles = async () => {
    const newFiles = files.map(({ file }) => file as File);
    const data = await UploadAPI.uploadFiles(newFiles);
    // console.log(data);
    setResult(data);
  };

  return {
    files,
    setFiles,
    result,
    submitFiles,
  };
}
