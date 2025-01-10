const promiseTry = (fn) => new Promise((resolve) => resolve(fn()));
const optimizedMapAndJoin = (array, mapFn, separator) =>
  array.reduce(
    (acc, current, index) =>
      index === 0 ? mapFn(current) : `${acc}${separator}${mapFn(current)}`,
    ''
  );

const arithmeticProgressionSequence = function* (firstTerm, commonDifference) {
  for (let i = firstTerm; true; i + commonDifference) {
    yield i;
  }
};

/* sparql結果からtable作成 */
const convertMapFromSparqlResJson = (primaryKey) => (bindings) => {
  return bindings.reduce((acc, item) => {
    const itemUri = item[primaryKey].value;
    const itemLabel = item[`${primaryKey}Label`].value;
    const otherFields = Object.entries(item)
      .filter(([key]) => key !== primaryKey && key !== `${primaryKey}Label`)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    if (!acc[itemUri]) {
      acc[itemUri] = new Map([
        ['label', itemLabel],
        ['otherVars', []],
      ]);
    }
    acc[itemUri] = new Map([
      ['label', itemLabel],
      ['otherVars', acc[itemUri].get('otherVars').concat(otherFields)],
    ]);

    return acc;
  }, {});
};

const createTHead = (vars) => {
  const thead = document.createElement('thead');
  const ths = Array.from(vars).map((v) => {
    const th = document.createElement('th');
    th.textContent = v;
    return th;
  });
  console.log(ths);
  const tr = document.createElement('tr');
  tr.append(...ths);
  thead.append(tr);
  console.log(thead);
  return thead;
};

const createRowSelectableTBody = (vars) => (data) => {
  const trs = Object.entries(data)
    .map(([key, value]) => {
      return value.get('otherVars').map((x, i, oriArr) => {
        const tr = document.createElement('tr');
        let hoge = '';
        if (i === 0) {
          const th = document.createElement('th');
          const labelTag = document.createElement('label');
          labelTag.classList.add('radio-container');
          const radioInput = document.createElement('input');
          radioInput.type = 'radio';
          radioInput.name = 'option';
          radioInput.value = `${key.replace(
            'http://www.wikidata.org/entity/',
            'wd:'
          )}`;
          const span = document.createElement('span');
          span.classList.add('radio-label');
          const label = document.createTextNode(value.get('label'));
          const openParenthesis = document.createTextNode('(');
          const closeParenthesis = document.createTextNode(')');
          const link = document.createElement('a');
          link.href = key;
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          link.textContent = key.replace(
            'http://www.wikidata.org/entity/',
            'wd:'
          );

          span.append(label, openParenthesis, link, closeParenthesis);
          labelTag.append(radioInput, span);
          th.rowSpan = oriArr.length;
          th.append(labelTag);
          tr.append(th);
        }
        const varsDeletedThVar = Array.from(vars).slice(1);
        const tds = varsDeletedThVar.map((v) => {
          const td = document.createElement('td');
          td.textContent = !!x?.[v] ? x[v]['value'] : '';
          return td;
        });
        tr.append(...tds);
        return tr;
      });
    })
    .flat();
  const tbody = document.createElement('tbody');
  tbody.append(...trs);
  console.log(tbody);
  return tbody;
};
const createTable = (theadCreator) => (tbodyCreator) => (vars) => (data) => {
  const tableElm = document.createElement('table');
  const thead = theadCreator(vars);
  const tbody = tbodyCreator(vars)(data);
  tableElm.append(thead, tbody);
  return tableElm;
};

const exactMatchSearch = (fetchFn) => (urlByWord) => async (word) =>
  await fetchFn(urlByWord(word));

const searchWikidataEntities =
  (searchFn) =>
  (additionalSearch) =>
  (filterFn) =>
  (formatFn) =>
  async (word) =>
    formatFn(filterFn(await additionalSearch(await searchFn(word))));

function waitForEvent(element, eventType, execute) {
  console.log(`waiting:${element}
        type:${eventType}`);
  return new Promise((resolve) => {
    const listener = (event) => {
      event.preventDefault();

      resolve(execute());
    };
    element.addEventListener(eventType, listener, { once: true });
  });
}

const createTableByWikidataEntities =
  (fetchDetailsInfoOfWikidataEntities) =>
  (primarykeyName) =>
  async (wikidataEntities) => {
    const wikidataEntitiesWithDetailsInfo =
      await fetchDetailsInfoOfWikidataEntities(wikidataEntities);

    const varsWithKeyvarRemoved = new Set(
      [...wikidataEntitiesWithDetailsInfo.head.vars].filter(
        (v) => v !== `${primarykeyName}Label`
      )
    );
    const tableElm = createTable(createTHead)(createRowSelectableTBody)(
      varsWithKeyvarRemoved
    )(
      convertMapFromSparqlResJson(primarykeyName)(
        wikidataEntitiesWithDetailsInfo.results.bindings
      )
    );
    return tableElm;
  };

/* v=== selection */
const fetchDetailsInfoOfWikidataEntities = async (wikidataEntities) => {
  const endpointUrl = 'https://query.wikidata.org/sparql';
  const sparqlQuery = (
    wDEntitiesStr
  ) => `select DISTINCT ?item ?itemLabel ?opt1Label?opt2Label
                        where{
                        VALUES ?item {${wDEntitiesStr}}
                        OPTIONAL{?item wdt:P31 ?opt1 .}
                        OPTIONAL{?item wdt:P279 ?opt2 .}
  
                            SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
                        }ORDER BY ?item
                        LIMIT 50`;
  const wDEntitiesStr = optimizedMapAndJoin(
    wikidataEntities,
    (iri) => iri.replace('http://www.wikidata.org/entity/', 'wd:'),
    ' '
  );
  const wikidataUrl = sparqlReqUrl(endpointUrl)(sparqlQuery(wDEntitiesStr));
  console.log(wikidataUrl);
  return await fetchJsonData()(wikidataUrl);
};

const extractWDEntitiesFromExactMatchSearchRes = (result) =>
  result.results.bindings.map((x) => x['item']['value']);
const sparqlReqUrl = (endpointUrl) => (sparqlQuery) =>
  `${endpointUrl}?query=${encodeURIComponent(sparqlQuery)}`;
const sparqlQuery4exactMatchByWord = (word) =>
  `SELECT ?item ?itemLabel
WHERE {
  {
    ?item rdfs:label "${word}"@ja.
  } UNION {
    ?item skos:altLabel "${word}"@ja.
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja". }
}
ORDER BY ASC(?item)`;
const wikidataApiUrl4exactMatchWithLimitAndOffset =
  (url) => (limit) => (offset) =>
    `${url} limit ${limit} offset ${offset}`;
const exactMatchSequence = (controller) => (limit) => (word) =>
  fetchFnWithpaginationSequence(offsetPaginationSequence)(
    fetchJsonData(controller)
  )(
    wikidataApiUrl4exactMatchWithLimitAndOffset(
      sparqlReqUrl('https://query.wikidata.org/sparql')(
        sparqlQuery4exactMatchByWord(word)
      )
    )
  )(limit);
// あいまい検索(label, altLabel, discription)
// wikimediaApi() extractWDEntitiesFromFuzzySearchRes
const extractWDEntitiesFromFuzzySearchRes = (result) =>
  result.search.map((x) => x['concepturi']);
const wikimediaApiUrlByWord = (word) =>
  'https://www.wikidata.org/w/api.php' +
  `?action=wbsearchentities&search=${word}&language=ja&format=json&origin=*`;
const wikiMediaApiUriWithLimitAndOffset = (url) => (limit) => (offset) =>
  `${url}&limit=${limit}&continue=${offset}`;
const fuzzySearchSequence = (controller) => (limit) => (word) =>
  fetchFnWithpaginationSequence(offsetPaginationSequence)(
    fetchJsonData(controller)
  )(wikiMediaApiUriWithLimitAndOffset(wikimediaApiUrlByWord(word)))(limit);
const toggleDisplay = (id) => {
  const elm = document.getElementById(id);
  let isDisplay = false;
  return () => {
    isDisplay = !isDisplay;
    if (isDisplay) {
      elm.style = '';
    } else {
      elm.style = '';
      elm.style.display = 'none';
    }
  };
};
const isGenerator = (obj) =>
  Object.prototype.toString.call(obj) === '[object Generator]';
