/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import CategoriesAPI from '../apis/CategoriesAPI';
import { getCategories } from '../store/selectors';
import { Category, setCategories } from '../store/slice';

export default function useCategories() {
  const categories = useAppSelector(getCategories);
  const dispatch = useAppDispatch();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await CategoriesAPI.getAll();
        console.log(data);
        dispatch(setCategories(data as Array<Category>));
      } catch (error) {
        console.log(error);
      }
    })();
  }, [dispatch]);

  return {
    categories,
  };
}
