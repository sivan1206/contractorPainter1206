"""Regenerate the delivered Analytics asset while retaining readable source."""
from pathlib import Path
import hashlib,shutil,subprocess

ROOT=Path(__file__).resolve().parents[1]
def build(root=ROOT):
    source=root/'assets/js/analytics.js';target=root/'assets/js/analytics.min.js'
    npx=shutil.which('npx.cmd') or shutil.which('npx')
    if not npx:raise RuntimeError('Node.js/npm is required to regenerate analytics.min.js')
    subprocess.run([npx,'--yes','terser@5.51.2',str(source),'--compress','--mangle','--output',str(target)],check=True)
    digest=hashlib.sha256(source.read_text(encoding='utf8').encode('utf8')).hexdigest()
    code=target.read_text(encoding='utf8')
    target.write_text(f'/* Generated with Terser 5.51.2; source-sha256: {digest} */\n'+code,encoding='utf8')
    print(f'Analytics: {source.stat().st_size} -> {target.stat().st_size} bytes')
if __name__=='__main__':build()
