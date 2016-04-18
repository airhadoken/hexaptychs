# Pop Hexaptychs Twitter Bot

This bot is set up to do the following:

1. Query Flickr for Creative Commons and Public Domain images matching tags like "celebrity," "portrait", "object", etc.
2. Download a randomly selected image from the search result
3. Process the image into six Andy Warhol-style screenprints in different colors
4. Assemble all six into one image
5. Tweet the results

The source code is here in this repository, so you can build your own clones, submit pull requests, and learn from it to build your own ImageMagick bots and Twitter things!

# Install Guide

If running locally, first run `npm install` to get required libraries, edit `config.json` with your Twitter and Flickr API keys, then start the bot with `node app.js`.

If running on Heroku a couple more steps are required:

This bot requires the latest and greatest ImageMagick (6.9.x) which is a few revisions later than comes natively with Heroku's Cedar-14 stack.  I forked and fixed up a [Heroku buildpack for ImageMagick](https://github.com/airhadoken/heroku-buildpack-imagemagick) from [Ello](https://github.com/ello/heroku-buildpack-imagemagick), after finding a bug in the original preventing install once the IM pack was built and cached.  So for now, you can use my version of the buildpack.  You also need to specify the default cedar-14 buildpack to install first, so IM can be overwritten by the other pack.  You can do this from the Heroku web interface, or run the following at the command line:

```console
$ heroku buildpack:add https://github.com/heroku/heroku-buildpack-nodejs
$ heroku buildpack:add https://github.com/airhadoken/heroku-buildpack-imagemagick
```

The non-native buildpack has a configuration requirement; it doesn't know where to find the configuration XML files, so set that as a shell var.

```console
$ heroku config:set MAGICK_CONFIGURE_PATH=/app/vendor/imagemagick/etc/ImageMagick-6
```

If you want to test the script at this point, at the command line type `heroku run node app.js -once`

Then install the Heroku scheduler add-on through the Web interface (resources tab) and set it up to run `node app.js -once` at your preferred interval.

# License

This project is copyright (C) 2015 Bradley Momberger and licensed under the MIT license. [https://opensource.org/licenses/MIT](https://opensource.org/licenses/MIT)

Linked libraries through NPM (currently Flickrapi, request, Q, and Twit) may have more restrictive licenses.  Check with those individual repositories for more.
