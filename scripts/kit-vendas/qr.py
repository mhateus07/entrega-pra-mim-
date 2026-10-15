# Gera assets/qr-whatsapp.svg (QR do one-pager: abre o WhatsApp da Impulsio com a mensagem pronta)
import urllib.parse, qrcode, qrcode.image.svg
url = 'https://wa.me/5532998578057?text=' + urllib.parse.quote('Olá! Quero ver uma demonstração do Entrega Pra Mim.')
qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=0, box_size=10,
            error_correction=qrcode.constants.ERROR_CORRECT_M).save('assets/qr-whatsapp.svg')
print(url)
