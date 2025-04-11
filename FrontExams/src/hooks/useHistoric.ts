/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getHistoric } from '../store/selectors';
import { Historic, setHistoric } from '../store/slice';
import HistoricAPI from '../apis/HistoricAPI';

export default function useHistoric() {
  const historic = useAppSelector(getHistoric);
  const dispatch = useAppDispatch();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await HistoricAPI.getAll();
        dispatch(setHistoric(data));
      } catch (error) {
        console.log(error);
      }
    })();
  }, [dispatch]);

  const removeRecord = useCallback(async (id: number) => {
    const { data } = await HistoricAPI.removeRecord(id);
    dispatch(setHistoric(data.historic as Historic));
  }, [dispatch]);

  return {
    historic,
    removeRecord,
  };
}
