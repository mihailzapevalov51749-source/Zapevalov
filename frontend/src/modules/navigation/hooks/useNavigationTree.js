import { useCallback, useEffect, useState } from "react";
import { navigationService } from "../services/navigationService";

export default function useNavigationTree(portalId) {
  const [navigation, setNavigation] = useState([]);
  const [isLoadingNavigation, setIsLoadingNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState("");

  const reloadNavigation = useCallback(async () => {
    try {
      setIsLoadingNavigation(true);
      setNavigationError("");

      const result = await navigationService.getTree(portalId);
      setNavigation(result);
    } catch (e) {
      console.error(e);
      setNavigationError("Ошибка загрузки меню");
    } finally {
      setIsLoadingNavigation(false);
    }
  }, [portalId]);

  useEffect(() => {
    reloadNavigation();
  }, [reloadNavigation]);

  return {
    navigation,
    isLoadingNavigation,
    navigationError,
    reloadNavigation,
  };
}