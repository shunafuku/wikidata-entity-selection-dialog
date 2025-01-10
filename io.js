const fetchWithErrorHandling = (fetchFn) => {
  return fetchFn()
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return null;
      } else {
        console.error('通信に失敗しました', error);
      }
    });
};

const fetchJsonData = (controller) => async (url) => {
  const headers = {
    Accept: 'application/results+json, application/sparql-results+json',
  };
  const signal = controller?.signal;
  const fetchRes =
    (await fetchWithErrorHandling(() =>
      fetch(url, {
        headers,
        method: 'GET',
        cache: 'no-cache',
        mode: 'cors',
        signal,
      })
    )) ?? '{}';
  return fetchRes.json();
};
