// Creates the ephemeral localhost TLS identity shared by the private SMTP
// listener and its Nodemailer client, so local setup needs no certificate files.
import selfsigned from 'selfsigned';

const generated = await selfsigned.generate(
  [{ name: 'commonName', value: 'localhost' }],
  {
    keySize: 2048,
    days: 30,
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
      ],
    }],
  }
);

export const smtpTlsOptions = { key: generated.private, cert: generated.cert };
export const smtpTlsCa = Buffer.from(generated.cert);