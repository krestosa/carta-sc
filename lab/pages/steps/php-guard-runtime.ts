{
  interface JQueryDeferredCompat {
    promise<T extends object>(target: T): T;
  }

  interface JQueryFunctionCompat {
    load?: (...args: unknown[]) => unknown;
  }

  interface JQueryCompat {
    Deferred?: () => JQueryDeferredCompat;
    ajax?: (...args: unknown[]) => unknown;
    fn?: JQueryFunctionCompat;
  }

  interface StaticFetchResponse {
    readonly ok: true;
    readonly status: 200;
    readonly statusText: 'OK';
    text(): Promise<string>;
    json(): Promise<Record<string, never>>;
  }

  const browser = window;

  const objectUrl = (input: unknown): string => {
    if (!input || typeof input !== 'object' || !('url' in input)) return '';
    const value = Reflect.get(input, 'url');
    return typeof value === 'string' ? value : '';
  };

  const requestUrl = (input: unknown): string => {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    const url = objectUrl(input);
    if (url) return url;
    return input == null ? '' : String(input);
  };

  const isPhpRequest = (input: unknown): boolean => {
    const value = requestUrl(input);
    if (!value) return false;
    try {
      return /\.php$/i.test(new URL(value, browser.location.href).pathname);
    } catch {
      return /\.php(?:[?#]|$)/i.test(value);
    }
  };

  const jqueryValue = Reflect.get(browser, 'jQuery');
  const jquery: JQueryCompat | null = jqueryValue && typeof jqueryValue === 'function'
    ? jqueryValue as JQueryCompat
    : null;

  if (jquery?.Deferred && typeof jquery.ajax === 'function') {
    const createDeferred = jquery.Deferred;
    const nativeAjax = jquery.ajax;
    jquery.ajax = function guardedAjax(this: unknown, ...args: unknown[]): unknown {
      const [url, options] = args;
      const target = typeof url === 'string'
        ? url
        : url && typeof url === 'object'
          ? objectUrl(url)
          : objectUrl(options);
      if (!isPhpRequest(target)) return nativeAjax.apply(this, args);

      const deferred = createDeferred();
      return deferred.promise({
        readyState: 0,
        status: 0,
        statusText: 'static-pages',
        responseText: '',
        abort() { return this; },
        getAllResponseHeaders() { return ''; },
        getResponseHeader() { return null; },
        setRequestHeader() { return this; },
        overrideMimeType() { return this; },
        statusCode() { return this; },
      });
    };

    if (jquery.fn && typeof jquery.fn.load === 'function') {
      const nativeLoad = jquery.fn.load;
      jquery.fn.load = function guardedLoad(this: unknown, ...args: unknown[]): unknown {
        const [url] = args;
        if (typeof url === 'string' && isPhpRequest(url.split(/\s+/)[0])) return this;
        return nativeLoad.apply(this, args);
      };
    }
  }

  if (typeof browser.fetch === 'function') {
    const nativeFetch = browser.fetch;
    const guardedFetch = (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response | StaticFetchResponse> => {
      if (!isPhpRequest(input)) return nativeFetch.call(browser, input, init);
      if (typeof browser.Response === 'function') {
        return Promise.resolve(new browser.Response('', { status: 200, statusText: 'OK' }));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(''),
        json: () => Promise.resolve({}),
      });
    };
    Reflect.set(browser, 'fetch', guardedFetch);
  }

  if (browser.navigator && typeof browser.navigator.sendBeacon === 'function') {
    const nativeBeacon = browser.navigator.sendBeacon.bind(browser.navigator);
    browser.navigator.sendBeacon = (url, data) => isPhpRequest(url) || nativeBeacon(url, data);
  }
}
