/* pagination.js */
const offsetPaginationSequence = (limit) =>
  function* (addPaginationParams) {
    for (let offset = 0; true; offset += limit) {
      yield addPaginationParams(limit)(offset);
    }
  };

const fetchFnWithpaginationSequence =
  (paginationSequence) => (fetchFn) => (addPaginationParams) =>
    function* (limit) {
      const sequence = paginationSequence(limit)(addPaginationParams);
      for (let offset = 0; true; offset += limit) {
        yield fetchFn(sequence.next().value);
      }
    };
