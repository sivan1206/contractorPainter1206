# Local verification

Python 3.9+ is needed by the public-site exporter. Tests were run with Python 3.13.

Install the recorded development dependencies and Chromium:

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/test_forms.py
python tests/test_build_site.py
python tools/build_site.py
```

Form tests run the real local HTML/JavaScript with all external requests blocked.
They use simulated popup handles and CAPTCHA responses; no real message is sent.
The export test uses an isolated temporary repository. Neither test proves live
GA4 delivery, CAPTCHA service success, WhatsApp message delivery or field CWV.

The generated `dist/` contains only allowed public pages, verification files and
assets. Working reports, tests, tooling and Python caches are excluded.
