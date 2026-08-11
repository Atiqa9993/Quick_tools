import requests, pathlib, sys

# Paths
pdf_path = pathlib.Path(r'C:/Users/Atiqa/Downloads/agricare.pdf')
if not pdf_path.is_file():
    print('PDF not found at', pdf_path)
    sys.exit(1)

url = 'http://127.0.0.1:3000/api/tools/compress-pdf'
files = {'file': (pdf_path.name, pdf_path.open('rb'), 'application/pdf')}
data = {'level': 'medium'}

print('Uploading', pdf_path.name, 'to', url)
resp = requests.post(url, files=files, data=data)
print('Status code:', resp.status_code)
if resp.ok:
    out_path = pathlib.Path('compressed_agricare.pdf')
    out_path.write_bytes(resp.content)
    print('Saved compressed file to', out_path.resolve())
else:
    print('Error response:', resp.text)
