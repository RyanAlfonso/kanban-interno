import { useCallback, useEffect, useState } from "react";

type useBackupStateProps<T> = {
  initialState: T;
};

const useBackupState = <T>({ initialState }: useBackupStateProps<T>) => {
  const [backupState, setBackupState] = useState(initialState);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(backupState);
  }, [backupState]);

  const reset = useCallback(() => {
    setState(backupState);
  }, [backupState]);

  return {
    state,
    setState,
    backupState,
    setBackupState,
    reset,
  };
};

export default useBackupState;
