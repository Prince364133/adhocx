export const SAMPLE_EMPLOYEE_CSV_TEXT = `employee_name,pickup_address,office_address,required_arrival_date,required_arrival_time,gender,phone_number
"Aarav Sharma","Aparna Sarovar Grande, Nallagandla, Gachibowli, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","MALE","+91 98765 43210"
"Priya Reddy","My Home Bhooja, Silpa Gram Craft Village, Madhapur, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","FEMALE","+91 98765 43211"
"Rohan Verma","Jayabheri Silicon County, Hitec City, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","MALE","+91 98765 43212"
"Sneha Kulkarni","Prestige High Fields, Financial District, Nanakramguda, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","FEMALE","+91 98765 43213"
"Vikram Malhotra","SMR Vinay City, Miyapur, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","MALE","+91 98765 43214"
"Ananya Deshmukh","Lodha Bellezza, Eden Square, Phase 4, KPHB Colony, Kukatpally, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","FEMALE","+91 98765 43215"
"Karthik Raju","Rainbow Vistas Rock Garden, IDL Access Road, Moosapet, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","MALE","+91 98765 43216"
"Divya Nair","Indis PBEL City, Peeramcheru, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","FEMALE","+91 98765 43217"
"Siddharth Joshi","Lanco Hills Apartments, Manikonda, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","MALE","+91 98765 43218"
"Meera Iyer","Road No 36, Jubilee Hills, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","FEMALE","+91 98765 43219"
"Aditya Prasad","Green Valley, Banjara Hills Road No 12, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","MALE","+91 98765 43220"
"Kavita Menon","Botanical Garden Road, Masjid Banda, Kondapur, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2026-11-17","08:00","FEMALE","+91 98765 43221"`;

export const PRE_GEOCODED_LOCATIONS: Record<string, { lat: number; lng: number; formatted: string }> = {
  "mindspace it park, hitec city, hyderabad": {
    lat: 17.4414734,
    lng: 78.3809827,
    formatted: "Mindspace IT Park, Hitec City, Hyderabad, Telangana 500081",
  },
  "aparna sarovar grande, nallagandla, gachibowli, hyderabad": {
    lat: 17.479532,
    lng: 78.311429,
    formatted: "Aparna Sarovar Grande, Nallagandla, Hyderabad, Telangana 500019",
  },
  "my home bhooja, silpa gram craft village, madhapur, hyderabad": {
    lat: 17.441926,
    lng: 78.382172,
    formatted: "My Home Bhooja, Silpa Gram Craft Village, Madhapur, Hyderabad, Telangana 500081",
  },
  "jayabheri silicon county, hitec city, hyderabad": {
    lat: 17.456102,
    lng: 78.368841,
    formatted: "Jayabheri Silicon County, Hitec City, Hyderabad, Telangana 500084",
  },
  "prestige high fields, financial district, nanakramguda, hyderabad": {
    lat: 17.417234,
    lng: 78.348122,
    formatted: "Prestige High Fields, Financial District, Nanakramguda, Hyderabad, Telangana 500032",
  },
  "smr vinay city, miyapur, hyderabad": {
    lat: 17.495204,
    lng: 78.349182,
    formatted: "SMR Vinay City, Miyapur, Hyderabad, Telangana 500049",
  },
  "lodha bellezza, eden square, phase 4, kphb colony, kukatpally, hyderabad": {
    lat: 17.487823,
    lng: 78.389214,
    formatted: "Lodha Bellezza, Phase 4, KPHB Colony, Kukatpally, Hyderabad, Telangana 500072",
  },
  "rainbow vistas rock garden, idl access road, moosapet, hyderabad": {
    lat: 17.472144,
    lng: 78.409152,
    formatted: "Rainbow Vistas Rock Garden, IDL Access Road, Moosapet, Hyderabad, Telangana 500018",
  },
  "indis pbel city, peeramcheru, hyderabad": {
    lat: 17.362145,
    lng: 78.361429,
    formatted: "Indis PBEL City, Peeramcheru, Hyderabad, Telangana 500091",
  },
  "lanco hills apartments, manikonda, hyderabad": {
    lat: 17.409124,
    lng: 78.378912,
    formatted: "Lanco Hills Apartments, Manikonda, Hyderabad, Telangana 500089",
  },
  "road no 36, jubilee hills, hyderabad": {
    lat: 17.433215,
    lng: 78.406124,
    formatted: "Road No 36, Jubilee Hills, Hyderabad, Telangana 500033",
  },
  "green valley, banjara hills road no 12, hyderabad": {
    lat: 17.421512,
    lng: 78.435122,
    formatted: "Green Valley, Banjara Hills Road No 12, Hyderabad, Telangana 500034",
  },
  "botanical garden road, masjid banda, kondapur, hyderabad": {
    lat: 17.462152,
    lng: 78.356124,
    formatted: "Botanical Garden Road, Masjid Banda, Kondapur, Hyderabad, Telangana 500084",
  },
  "tarnaka main road, tarnaka, hyderabad": {
    lat: 17.429183,
    lng: 78.533607,
    formatted: "Tarnaka Main Rd, Tarnaka, Secunderabad, Telangana 500017",
  },
  "tarnaka main road, tarnaka, secunderabad": {
    lat: 17.429183,
    lng: 78.533607,
    formatted: "Tarnaka Main Rd, Tarnaka, Secunderabad, Telangana 500017",
  },
  "peerzadiguda main road, peerzadiguda, hyderabad": {
    lat: 17.394826,
    lng: 78.593991,
    formatted: "Peerzadiguda Rd, Peerzadiguda, Hyderabad, Telangana 500098",
  },
  "peerzadiguda road, hyderabad, telangana": {
    lat: 17.394826,
    lng: 78.593991,
    formatted: "Peerzadiguda Rd, Peerzadiguda, Hyderabad, Telangana 500098",
  },
  "uppal, hyderabad": {
    lat: 17.401834,
    lng: 78.560183,
    formatted: "Uppal, Hyderabad, Telangana 500039",
  },
  "habsiguda, hyderabad": {
    lat: 17.417245,
    lng: 78.548212,
    formatted: "Habsiguda, Hyderabad, Telangana 500007",
  },
  "boduppal, hyderabad": {
    lat: 17.413245,
    lng: 78.583124,
    formatted: "Boduppal, Hyderabad, Telangana 500092",
  },
};
