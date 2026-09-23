### IOS shortcut setup

There are two ios shortcuts, one for each direction. Both show up in the share sheet and end by opening whatsapp with a pre-filled message

These are the main actions rather than an exact copy of my setup, and action names can vary a bit between ios versions. I haven't included the exported .shortcut files because they can contain personal contacts and urls.

Placeholders used below:

- [WORKER_URL] - your deployed worker, e.g. https://spotify-to-anghami.{your-subdomain}.workers.dev
- [RECIPIENT_PHONE_NUMBER] - the recipient's number in international format without the +, spaces or the leading zero, e.g. 447XXXXXXXXX

Your spotify and musiclink credentials don't go in the shortcuts - they're stored as cloudflare worker secrets.

It's a good idea to favourite both shortcuts in 'edit actions' (at the bottom of the share sheet) so they come up straight away when you press share

#### 1. Send to anghami (spotify -> anghami)

In the shortcut settings, turn on 'show in share sheet' and let it accept urls and text.

1. Receive urls and text input from the share sheet.
2. Use 'match text' on the shortcut input with this pattern:
   ```
   track/([A-Za-z0-9]+)
   ```
3. Use 'get group from matched text' with group index 1. This is the spotify track id
4. Use 'get contents of url' (method GET):
   ```
   [WORKER_URL]/?track=[Track ID]
   ```
5. Use 'get dictionary value' on the response for title, artist and anghami.
6. If anghami has no value, use 'show alert' with the response's error value, then 'stop shortcut'.
7. Use 'text' to write the message, e.g.
   ```
   🎵 [title] by [artist]
   [anghami]
   ```
8. Use 'url encode' on the text.
9. Use 'open urls':
   ```
   https://wa.me/[RECIPIENT_PHONE_NUMBER]?text=[URL Encoded Text]
   ```

The worker sends back json with title, artist, anghami and musiclink fields.

This one can take a few seconds, since musiclink sometimes has to resolve the track across platforms first

#### 2. Send to spotify (anghami -> spotify)

In the shortcut settings, turn on 'show in share sheet' and let it accept text and urls.

Anghami shares text like "Listen to “Song Title” by Artist Name on Anghami https://open.anghami.com/..."

1. Receive text and url input from the share sheet.
2. Use 'url encode' on the shortcut input.
3. Use 'get contents of url' (method GET):
   ```
   [WORKER_URL]/anghami-to-spotify?share=[URL Encoded Text]
   ```
4. Use 'get dictionary value' on the response for title, artist and spotify
5. If spotify has no value, use 'show alert' with the response's error value, then 'stop shortcut'.
6. Use 'text' to write the message, e.g.
   ```
   🎵 [title] by [artist]
   [spotify]
   ```
7. Use 'url encode' on the text.
8. Use 'open urls':
   ```
   https://wa.me/[RECIPIENT_PHONE_NUMBER]?text=[URL Encoded Text]
   ```

The worker sends back json with title, artist and spotify fields.

You can also skip the share text and pass the title and artist directly, e.g. [WORKER_URL]/anghami-to-spotify?title=Song%20Title&artist=Artist%20Name

#### Tips

- If you want to pick the recipient each time, swap the fixed number for an 'ask for input' action, or leave the number out completely (wa.me/?text=...) and whatsapp will ask you which chat to use
- If something isn't working, add a 'quick look' after 'get contents of url' to see the worker's json response. Every error response has an error field.
