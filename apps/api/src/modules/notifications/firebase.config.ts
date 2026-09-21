export interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

export const defaultFirebaseServiceAccount: FirebaseServiceAccount = {
  type: 'service_account',
  project_id: 'adhocx-507407',
  private_key_id: 'a82b6c7b41a398fd801ac5d5a1d4232401d0e6c6',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDQ3LtVGHOIg6i0\nMUc0amNMIT8fDIXSDf0ebECRlw1mGTX5ghhoFrLQ4UzJoRL7grp5118aifZ75g60\nbUnwAKiZclBX+iIU20UeMSI5VMirku7zLnruQHgVi5KPGM0Yb87iMCoGIxy8jJkg\n96CqJVMvIuZYnveyhGR415OiirA1nhwK5+Bn0Pp+kHu4wECoCH7miTkFJrvmllJ1\nX529BtHWoIFjhiLplWKQiQca4zwK7MMrp0C+FSLyZPs10Fd3tsEWgttw6k4Kx4bW\n3b+rXeC7SMHLB2dZ25II7OxT1P4IniPlAzln3+eJJ8r8alFSaB4Y0o16Fy7h+vhy\n6GXmMZolAgMBAAECgf9ZBgDCBJSxfWyzg2+vydwaNM1IHZsfpM46aWm1tahZ+ik2\nTifuWAK1HzC5fB1Sp7+YJsnNRglNvZJtXbBmICYBH2/jqXoIC+VuShQU27Tf9Tyo\ncwlyv4fnHoE7p7AqC1v0JorUCk31VCt5Q/DmLnGGVMR7+QHFkSioakupiSbfCERf\nczsLqQ5E/CKqwzeODIgL07sOsYzV2GQWXrdri0qxoSQbznD2pN9efklutRR7GEpD\nIr4TcbzaQola2Lbp6y6X5+AzwEamvG3lFmlJycvGaxQV99ye2dyevxCUMqPz9/HO\nrson9qlkplECpIeXaorGX0DXvVu/ofdDjQjAhOECgYEA77M19jfevZJHbRXBs9Kk\nsPs4XDnjV6niRuZt1DzSobN7DKG/NwmnzYCZej+G8cFbJyftW596rzVEjsoL4dDa\nzDvmUQ+X+a4p183CquSufgSyE2g84ua/Fchc6zjmgTVR7dV1dsBTPLS4xt6opN6v\ns9xxEiWNKBAnf6LRyF65QEUCgYEA3xCvSWkYW/piTjY3tyPUcyzUpqKeXSuMX40A\ntwdkr4Uz/463R+m87u03F7m1GbYiqttF/GWasZr1C8P7Wi2ayJn3NkDh2Hs+XBsr\npVp9w2GCLvt94iAHX2x0bxQjMM81xb0QGAo8MWceA3eXWY3ZpqtRlFIXnKWBZv2Q\nRA6jQGECgYEAicJEVBJ+CBNmy3HClneMQU7QcGiwmPRA4KCUJHMkVtyQ7oyTGa2J\n7BhpnJGgG5cVrSZMSukYGFQT58CFHa3r4Y7XamT84flPgQB3TcIJ6tEGCxNQUtNs\npLc3d9SG3WFoibixPqN/8xamT10uLTryXftmXJiKTKkkGj3YNUEDVMUCgYEA1l9L\nhgp5PZPgu/eBDgFiIBoad9ZayYGbkwyIfl2dls01zslSPMtWJmxVAPkZIY+Xu4ml\ntc3ToBIio98CBYVEdrr5COvL4Gd447288VmI+acRHKPXM+TCESPCtimtNDA/Jjzv\nZZsYhAXsozpgetFHNdT5PsiyJnosZVUUO0OyAqECgYEAk7hu2umHjWf2USImp2d3\nbCFUQnRKFmzCtH1Q406OOwIcxXrQMrsFDt1M33xIkdabMvwV+f32w5ulv3nv40bN\nJMD+i3JzU5/0rQ3sFzGUgrFKVVmfgrOcX0sc4UOts/l83FfivrdrG83/vF6df41V\ndDOKDW9jT1g7X40EN/rYENs=\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@adhocx-507407.iam.gserviceaccount.com',
  client_id: '101597508447086307053',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40adhocx-507407.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
};
