# hurmpf-webapp-template

Template for a simple Web Application, using some PHP back-office

## Features

- Single Page Application,using JS to dynamically show blocks
- Offline caching using Service Workers, or ApplicationCache on older browsers
- Loading screen
- Utility functions

## Details

### Caching

Main page index.php can be passed with `appcache` argument to use ApplicationCache, or `nocache` to disable caching.

If Service Worker or IndexedDB is not available, `offline-handler.js` will redirect root adding the `?appcache` argument, telling the page to use ApplicationCache instead.

`offline.php` builds a list of files to cache, either JSON for SW or manifest for Application Cache
The service worker will only download files changed since last download (using last-modified-date)
`offline.php` can be customized to exclude some files or directories.

