# hurmpf-offline-sw

This is a Service Worker script for offline support.

## Features

- loads a manifest JSON file listing files to cache
- each file is associated to a hash, eg. md5 of the file or last modified date
- during update, download only modified files
- manifest may also contain size of cache to inform client
- manifest can be dynamic (eg. PHP) or built with app (eg. Gulp)
- broadcast messages when downloading update
- no external dependency

## How to use it

Exemple `offline.php`, `script.js` and `index.html` are provided.

You may change anything without incidence, the only requisite is the manifest format, which must be like :
...
{
	"size": 67581,
	"mainPage":"index.html",
	"files":{
		"favicon.ico":"415c25d0733bdce7795985d6fd32710b",
		"img/logo.jpg":"359e4445de155b3503a3f87472278338",
		"index.html":"33abc30e77848adc72db9d8895675606",
		"script.js":"0becb94ae431db9fb17e7116d8717209"
	}
}
...

`offline.php` generate this automatically, and can be customized to exclude some files or directories.