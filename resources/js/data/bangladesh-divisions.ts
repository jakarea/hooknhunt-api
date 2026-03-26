export interface Thana {
  name: string
}

export interface District {
  name: string
  thanas: Thana[]
}

export interface Division {
  name: string
  districts: District[]
}

export const bangladeshDivisions: Division[] = [
  {
    name: "Dhaka",
    districts: [
      {
        name: "Dhaka",
        thanas: [
          { name: "Savar" },
          { name: "Dhamrai" },
          { name: "Keraniganj" },
          { name: "Nawabganj" },
          { name: "Dohar" },
          { name: "Gulshan" },
          { name: "Dhanmondi" },
          { name: "Mirpur" },
          { name: "Pallabi" },
          { name: "Cantonment" },
          { name: "Ramna" },
          { name: "Motijheel" },
          { name: "Paltan" },
          { name: "Dhanmondi" },
          { name: "Lalbagh" },
          { name: "Hazaribagh" },
          { name: "Kotwali" },
          { name: "Sutrapur" },
          { name: "Bangsal" },
          { name: "Hazaribagh" },
          { name: "Demra" },
          { name: "Shyampur" },
          { name: "Badda" },
          { name: "Gulshan" },
          { name: "Uttara" },
          { name: "Turag" },
          { name: "Dakshinkhan" },
          { name: "Khilgaon" },
          { name: "Kamrangirchar" },
          { name: "Tejgaon" },
          { name: "Sher-e-Bangla Nagar" },
          { name: "Kafrul" },
          { name: "Paltan" },
          { name: "Adabor" },
          { name: "Mohammadpur" },
          { name: "Pallabi" },
          { name: "Rampura" },
          { name: "Sabujbagh" },
          { name: "Bosila" },
          { name: "Uttar Khan" }
        ]
      },
      {
        name: "Gazipur",
        thanas: [
          { name: "Gazipur Sadar" },
          { name: "Kaliakair" },
          { name: "Kaliganj" },
          { name: "Kapasia" },
          { name: "Sreepur" },
          { name: "Tongi" }
        ]
      },
      {
        name: "Narayanganj",
        thanas: [
          { name: "Narayanganj Sadar" },
          { name: "Araihazar" },
          { name: "Bandar" },
          { name: "Rupganj" },
          { name: "Sonargaon" },
          { name: "Fatullah" },
          { name: "Siddhirganj" }
        ]
      },
      {
        name: "Tangail",
        thanas: [
          { name: "Tangail Sadar" },
          { name: "Basail" },
          { name: "Bhuapur" },
          { name: "Delduar" },
          { name: "Ghatail" },
          { name: "Gopalpur" },
          { name: "Kalihati" },
          { name: "Madhupur" },
          { name: "Mirzapur" },
          { name: "Nagarpur" },
          { name: "Sakhipur" },
          { name: "Dhanbari" }
        ]
      },
      {
        name: "Kishoreganj",
        thanas: [
          { name: "Kishoreganj Sadar" },
          { name: "Austogram" },
          { name: "Bajitpur" },
          { name: "Bhairab" },
          { name: "Hossainpur" },
          { name: "Itna" },
          { name: "Karimganj" },
          { name: "Katiadi" },
          { name: "Kuliarchar" },
          { name: "Mithamain" },
          { name: "Nikli" },
          { name: "Pakundia" },
          { name: "Tarail" }
        ]
      },
      {
        name: "Manikganj",
        thanas: [
          { name: "Manikganj Sadar" },
          { name: "Daulatpur" },
          { name: "Ghior" },
          { name: "Harirampur" },
          { name: "Saturia" },
          { name: "Shivalaya" },
          { name: "Singair" }
        ]
      },
      {
        name: "Munshiganj",
        thanas: [
          { name: "Munshiganj Sadar" },
          { name: "Gazaria" },
          { name: "Lohajang" },
          { name: "Sirajdikhan" },
          { name: "Sreenagar" },
          { name: "Tongibari" }
        ]
      },
      {
        name: "Narsingdi",
        thanas: [
          { name: "Narsingdi Sadar" },
          { name: "Belabo" },
          { name: "Monohardi" },
          { name: "Palash" },
          { name: "Raipura" },
          { name: "Shibpur" }
        ]
      },
      {
        name: "Faridpur",
        thanas: [
          { name: "Faridpur Sadar" },
          { name: "Alfadanga" },
          { name: "Bhanga" },
          { name: "Boalmari" },
          { name: "Charbhadrasan" },
          { name: "Madhukhali" },
          { name: "Nagarkanda" },
          { name: "Sadarpur" },
          { name: "Saltha" }
        ]
      },
      {
        name: "Gopalganj",
        thanas: [
          { name: "Gopalganj Sadar" },
          { name: "Kashiani" },
          { name: "Kotalipara" },
          { name: "Muksudpur" },
          { name: "Tungipara" }
        ]
      },
      {
        name: "Madaripur",
        thanas: [
          { name: "Madaripur Sadar" },
          { name: "Kalkini" },
          { name: "Rajoir" },
          { name: "Shibchar" },
          { name: "Dasar" }
        ]
      },
      {
        name: "Rajbari",
        thanas: [
          { name: "Rajbari Sadar" },
          { name: "Baliakandi" },
          { name: "Goalanda" },
          { name: "Pangsha" },
          { name: "Kalukhali" }
        ]
      },
      {
        name: "Shariatpur",
        thanas: [
          { name: "Shariatpur Sadar" },
          { name: "Bhedarganj" },
          { name: "Damudya" },
          { name: "Gosairhat" },
          { name: "Naria" },
          { name: "Zanjira" }
        ]
      }
    ]
  },
  {
    name: "Chattogram",
    districts: [
      {
        name: "Chattogram",
        thanas: [
          { name: "Patiya" },
          { name: "Hathazari" },
          { name: "Sandwip" },
          { name: "Fatikchhari" },
          { name: "Rangunia" },
          { name: "Raozan" },
          { name: "Mirsharai" },
          { name: "Sitakunda" },
          { name: "Boalkhali" },
          { name: "Anwara" },
          { name: "Chandanaish" },
          { name: "Lohagara" },
          { name: "Banshkhali" },
          { name: "Satkania" },
          { name: "Karnaphuli" }
        ]
      },
      {
        name: "Cox's Bazar",
        thanas: [
          { name: "Cox's Bazar Sadar" },
          { name: "Chakaria" },
          { name: "Maheshkhali" },
          { name: "Ramu" },
          { name: "Teknaf" },
          { name: "Ukhia" },
          { name: "Pekua" },
          { name: "Kutubdia" }
        ]
      },
      {
        name: "Cumilla",
        thanas: [
          { name: "Cumilla Sadar" },
          { name: "Barura" },
          { name: "Brahmanpara" },
          { name: "Burichang" },
          { name: "Chandina" },
          { name: "Chauddagram" },
          { name: "Daudkandi" },
          { name: "Debidwar" },
          { name: "Homna" },
          { name: "Laksam" },
          { name: "Muradnagar" },
          { name: "Nangalkot" },
          { name: "Titas" },
          { name: "Monohorgonj" },
          { name: "Meghna" }
        ]
      },
      {
        name: "Brahmanbaria",
        thanas: [
          { name: "Brahmanbaria Sadar" },
          { name: "Akhaura" },
          { name: "Ashuganj" },
          { name: "Bancharampur" },
          { name: "Bijoy nagar" },
          { name: "Kasba" },
          { name: "Nabinagar" },
          { name: "Nasirnagar" },
          { name: "Sarail" }
        ]
      },
      {
        name: "Feni",
        thanas: [
          { name: "Feni Sadar" },
          { name: "Chhagalnaiya" },
          { name: "Daganbhuiyan" },
          { name: "Parshuram" },
          { name: "Sonagazi" },
          { name: "Fulgazi" }
        ]
      },
      {
        name: "Chandpur",
        thanas: [
          { name: "Chandpur Sadar" },
          { name: "Faridganj" },
          { name: "Haimchar" },
          { name: "Hajiganj" },
          { name: "Kachua" },
          { name: "Matlab North" },
          { name: "Matlab South" },
          { name: "Shahrasti" }
        ]
      },
      {
        name: "Lakshmipur",
        thanas: [
          { name: "Lakshmipur Sadar" },
          { name: "Raipur" },
          { name: "Ramganj" },
          { name: "Ramgati" },
          { name: "Kamalnagar" }
        ]
      },
      {
        name: "Noakhali",
        thanas: [
          { name: "Noakhali Sadar" },
          { name: "Begumganj" },
          { name: "Chatkhil" },
          { name: "Companiganj" },
          { name: "Hatiya" },
          { name: "Senbagh" },
          { name: "Sonaimuri" },
          { name: "Subarnachar" },
          { name: "Kabirhat" }
        ]
      },
      {
        name: "Bandarban",
        thanas: [
          { name: "Bandarban Sadar" },
          { name: "Ali Kadam" },
          { name: "Lama" },
          { name: "Naikhongchhari" },
          { name: "Rowangchhari" },
          { name: "Ruma" },
          { name: "Thanchi" }
        ]
      },
      {
        name: "Khagrachhari",
        thanas: [
          { name: "Khagrachhari Sadar" },
          { name: "Dighinala" },
          { name: "Lakshmichhari" },
          { name: "Mahalchhari" },
          { name: "Manikchhari" },
          { name: "Matiranga" },
          { name: "Panchhari" },
          { name: "Ramgarh" },
          { name: "Guimara" }
        ]
      },
      {
        name: "Rangamati",
        thanas: [
          { name: "Rangamati Sadar" },
          { name: "Baghaichhari" },
          { name: "Barkal" },
          { name: "Belaichhari" },
          { name: "Jurachhari" },
          { name: "Kaptai" },
          { name: "Kawkhali" },
          { name: "Langadu" },
          { name: "Naniarchar" },
          { name: "Rajasthali" }
        ]
      }
    ]
  },
  {
    name: "Rajshahi",
    districts: [
      {
        name: "Rajshahi",
        thanas: [
          { name: "Paba" },
          { name: "Bagha" },
          { name: "Bagmara" },
          { name: "Charghat" },
          { name: "Durgapur" },
          { name: "Godagari" },
          { name: "Mohanpur" },
          { name: "Puthia" },
          { name: "Tanore" }
        ]
      },
      {
        name: "Bogura",
        thanas: [
          { name: "Bogura Sadar" },
          { name: "Adamdighi" },
          { name: "Dhunat" },
          { name: "Dhupchanchia" },
          { name: "Gabtali" },
          { name: "Kahaloo" },
          { name: "Nandigram" },
          { name: "Sariakandi" },
          { name: "Shajahanpur" },
          { name: "Sherpur" },
          { name: "Shibganj" },
          { name: "Sonatola" }
        ]
      },
      {
        name: "Pabna",
        thanas: [
          { name: "Pabna Sadar" },
          { name: "Atgharia" },
          { name: "Bera" },
          { name: "Bhangura" },
          { name: "Chatmohar" },
          { name: "Faridpur" },
          { name: "Ishwardi" },
          { name: "Santhia" },
          { name: "Sujanagar" }
        ]
      },
      {
        name: "Sirajganj",
        thanas: [
          { name: "Sirajganj Sadar" },
          { name: "Belkuchi" },
          { name: "Chauhali" },
          { name: "Kamarkhanda" },
          { name: "Kazipur" },
          { name: "Raiganj" },
          { name: "Shahjadpur" },
          { name: "Tarash" },
          { name: "Ullahpara" }
        ]
      },
      {
        name: "Naogaon",
        thanas: [
          { name: "Naogaon Sadar" },
          { name: "Atrai" },
          { name: "Badalgachhi" },
          { name: "Dhamoirhat" },
          { name: "Manda" },
          { name: "Mahadebpur" },
          { name: "Niamatpur" },
          { name: "Patnitala" },
          { name: "Porsha" },
          { name: "Raninagar" },
          { name: "Sapahar" }
        ]
      },
      {
        name: "Natore",
        thanas: [
          { name: "Natore Sadar" },
          { name: "Bagatipara" },
          { name: "Baraigram" },
          { name: "Gurudaspur" },
          { name: "Lalpur" },
          { name: "Singra" },
          { name: "Naldanga" }
        ]
      },
      {
        name: "Chapainawabganj",
        thanas: [
          { name: "Sadar" },
          { name: "Bholahat" },
          { name: "Gomastapur" },
          { name: "Nachole" },
          { name: "Shibganj" }
        ]
      },
      {
        name: "Joypurhat",
        thanas: [
          { name: "Joypurhat Sadar" },
          { name: "Akkelpur" },
          { name: "Kalai" },
          { name: "Khetlal" },
          { name: "Panchbibi" }
        ]
      }
    ]
  },
  {
    name: "Khulna",
    districts: [
      {
        name: "Khulna",
        thanas: [
          { name: "Khulna Sadar" },
          { name: "Batiaghata" },
          { name: "Dacope" },
          { name: "Dumuria" },
          { name: "Dighalia" },
          { name: "Koyra" },
          { name: "Paikgachha" },
          { name: "Phultala" },
          { name: "Rupsha" },
          { name: "Terokhada" }
        ]
      },
      {
        name: "Jashore",
        thanas: [
          { name: "Jashore Sadar" },
          { name: "Abhaynagar" },
          { name: "Bagherpara" },
          { name: "Chaugachha" },
          { name: "Jhikargachha" },
          { name: "Keshabpur" },
          { name: "Manirampur" },
          { name: "Sharsha" }
        ]
      },
      {
        name: "Bagerhat",
        thanas: [
          { name: "Bagerhat Sadar" },
          { name: "Chitalmari" },
          { name: "Fakirhat" },
          { name: "Kachua" },
          { name: "Mollahat" },
          { name: "Mongla" },
          { name: "Morrelganj" },
          { name: "Rampal" },
          { name: "Sarankhola" }
        ]
      },
      {
        name: "Kushtia",
        thanas: [
          { name: "Kushtia Sadar" },
          { name: "Bheramara" },
          { name: "Daulatpur" },
          { name: "Khoksa" },
          { name: "Kumarkhali" },
          { name: "Mirpur" }
        ]
      },
      {
        name: "Satkhira",
        thanas: [
          { name: "Satkhira Sadar" },
          { name: "Assasuni" },
          { name: "Debhata" },
          { name: "Kalaroa" },
          { name: "Kaliganj" },
          { name: "Shyamnagar" },
          { name: "Tala" }
        ]
      },
      {
        name: "Jhenaidah",
        thanas: [
          { name: "Jhenaidah Sadar" },
          { name: "Harinakunda" },
          { name: "Kaliganj" },
          { name: "Kotchandpur" },
          { name: "Maheshpur" },
          { name: "Shailkupa" }
        ]
      },
      {
        name: "Chuadanga",
        thanas: [
          { name: "Chuadanga Sadar" },
          { name: "Alamdanga" },
          { name: "Damurhuda" },
          { name: "Jibannagar" }
        ]
      },
      {
        name: "Magura",
        thanas: [
          { name: "Magura Sadar" },
          { name: "Mohammadpur" },
          { name: "Shalikha" },
          { name: "Sreepur" }
        ]
      },
      {
        name: "Meherpur",
        thanas: [
          { name: "Meherpur Sadar" },
          { name: "Gangni" },
          { name: "Mujibnagar" }
        ]
      },
      {
        name: "Narail",
        thanas: [
          { name: "Narail Sadar" },
          { name: "Kalia" },
          { name: "Lohagara" }
        ]
      }
    ]
  },
  {
    name: "Barishal",
    districts: [
      {
        name: "Barishal",
        thanas: [
          { name: "Barishal Sadar" },
          { name: "Agailjhara" },
          { name: "Babuganj" },
          { name: "Bakerganj" },
          { name: "Banaripara" },
          { name: "Gournadi" },
          { name: "Hijla" },
          { name: "Mehendiganj" },
          { name: "Muladi" },
          { name: "Wazirpur" }
        ]
      },
      {
        name: "Bhola",
        thanas: [
          { name: "Bhola Sadar" },
          { name: "Burhanuddin" },
          { name: "Char Fasson" },
          { name: "Daulatkhan" },
          { name: "Lalmohan" },
          { name: "Manpura" },
          { name: "Tazumuddin" }
        ]
      },
      {
        name: "Patuakhali",
        thanas: [
          { name: "Patuakhali Sadar" },
          { name: "Bauphal" },
          { name: "Dashmina" },
          { name: "Galachipa" },
          { name: "Kalapara" },
          { name: "Mirzaganj" },
          { name: "Rangabali" },
          { name: "Dumki" }
        ]
      },
      {
        name: "Pirojpur",
        thanas: [
          { name: "Pirojpur Sadar" },
          { name: "Bhandaria" },
          { name: "Kawkhali" },
          { name: "Mathbaria" },
          { name: "Nazirpur" },
          { name: "Nesarabad" },
          { name: "Indurkani" }
        ]
      },
      {
        name: "Barguna",
        thanas: [
          { name: "Barguna Sadar" },
          { name: "Amtali" },
          { name: "Bamna" },
          { name: "Betagi" },
          { name: "Patharghata" },
          { name: "Taltali" }
        ]
      },
      {
        name: "Jhalokati",
        thanas: [
          { name: "Jhalokati Sadar" },
          { name: "Kathalia" },
          { name: "Nalchity" },
          { name: "Rajapur" }
        ]
      }
    ]
  },
  {
    name: "Sylhet",
    districts: [
      {
        name: "Sylhet",
        thanas: [
          { name: "Sylhet Sadar" },
          { name: "Balaganj" },
          { name: "Beanibazar" },
          { name: "Bishwanath" },
          { name: "Companiganj" },
          { name: "Fenchuganj" },
          { name: "Golapganj" },
          { name: "Gowainghat" },
          { name: "Jaintiapur" },
          { name: "Kanaighat" },
          { name: "Zakiganj" },
          { name: "South Surma" },
          { name: "Osmaninagar" }
        ]
      },
      {
        name: "Habiganj",
        thanas: [
          { name: "Habiganj Sadar" },
          { name: "Ajmeriganj" },
          { name: "Bahubal" },
          { name: "Baniyachong" },
          { name: "Chunarughat" },
          { name: "Lakhai" },
          { name: "Madhabpur" },
          { name: "Nabiganj" },
          { name: "Shayestaganj" }
        ]
      },
      {
        name: "Moulvibazar",
        thanas: [
          { name: "Moulvibazar Sadar" },
          { name: "Barlekha" },
          { name: "Kamalganj" },
          { name: "Kulaura" },
          { name: "Rajnagar" },
          { name: "Sreemangal" },
          { name: "Juri" }
        ]
      },
      {
        name: "Sunamganj",
        thanas: [
          { name: "Sunamganj Sadar" },
          { name: "Bishwamandarpur" },
          { name: "Chhatak" },
          { name: "Derai" },
          { name: "Dharampasha" },
          { name: "Dowarabazar" },
          { name: "Jagannathpur" },
          { name: "Jamalganj" },
          { name: "Sullah" },
          { name: "Tahirpur" },
          { name: "Shantiganj" }
        ]
      }
    ]
  },
  {
    name: "Rangpur",
    districts: [
      {
        name: "Rangpur",
        thanas: [
          { name: "Rangpur Sadar" },
          { name: "Badarganj" },
          { name: "Gangachhara" },
          { name: "Kaunia" },
          { name: "Mithapukur" },
          { name: "Pirgachha" },
          { name: "Pirganj" },
          { name: "Taraganj" }
        ]
      },
      {
        name: "Dinajpur",
        thanas: [
          { name: "Dinajpur Sadar" },
          { name: "Birampur" },
          { name: "Birganj" },
          { name: "Birol" },
          { name: "Bochaganj" },
          { name: "Chirirbandar" },
          { name: "Ghoraghat" },
          { name: "Hakimpur" },
          { name: "Kaharole" },
          { name: "Khansama" },
          { name: "Nawabganj" },
          { name: "Parbatipur" },
          { name: "Phulbari" }
        ]
      },
      {
        name: "Gaibandha",
        thanas: [
          { name: "Gaibandha Sadar" },
          { name: "Phulchhari" },
          { name: "Gobindaganj" },
          { name: "Palashbari" },
          { name: "Sadullapur" },
          { name: "Sughatta" },
          { name: "Sundarganj" }
        ]
      },
      {
        name: "Kurigram",
        thanas: [
          { name: "Kurigram Sadar" },
          { name: "Bhurungamari" },
          { name: "Char Rajibpur" },
          { name: "Chilmari" },
          { name: "Phulbari" },
          { name: "Nageshwari" },
          { name: "Rajarhat" },
          { name: "Raumari" },
          { name: "Ulipur" }
        ]
      },
      {
        name: "Nilphamari",
        thanas: [
          { name: "Nilphamari Sadar" },
          { name: "Dimla" },
          { name: "Domar" },
          { name: "Jaldhaka" },
          { name: "Kishoreganj" },
          { name: "Saidpur" }
        ]
      },
      {
        name: "Panchagarh",
        thanas: [
          { name: "Panchagarh Sadar" },
          { name: "Atwari" },
          { name: "Boda" },
          { name: "Debiganj" },
          { name: "Tetulia" }
        ]
      },
      {
        name: "Thakurgaon",
        thanas: [
          { name: "Thakurgaon Sadar" },
          { name: "Baliadangi" },
          { name: "Haripur" },
          { name: "Pirganj" },
          { name: "Ranisankail" }
        ]
      },
      {
        name: "Lalmonirhat",
        thanas: [
          { name: "Lalmonirhat Sadar" },
          { name: "Aditmari" },
          { name: "Hatibandha" },
          { name: "Kaliganj" },
          { name: "Patgram" }
        ]
      }
    ]
  },
  {
    name: "Mymensingh",
    districts: [
      {
        name: "Mymensingh",
        thanas: [
          { name: "Mymensingh Sadar" },
          { name: "Bhaluka" },
          { name: "Dhobaura" },
          { name: "Fulbaria" },
          { name: "Gaffargaon" },
          { name: "Gouripur" },
          { name: "Haluaghat" },
          { name: "Ishwarganj" },
          { name: "Muktagachha" },
          { name: "Nandail" },
          { name: "Phulpur" },
          { name: "Trishal" },
          { name: "Tarakanda" }
        ]
      },
      {
        name: "Jamalpur",
        thanas: [
          { name: "Jamalpur Sadar" },
          { name: "Bakshiganj" },
          { name: "Dewanganj" },
          { name: "Islampur" },
          { name: "Madarganj" },
          { name: "Melandaha" },
          { name: "Sarishabari" }
        ]
      },
      {
        name: "Netrokona",
        thanas: [
          { name: "Netrokona Sadar" },
          { name: "Atpara" },
          { name: "Barhatta" },
          { name: "Durgapur" },
          { name: "Khaliajuri" },
          { name: "Kalmakanda" },
          { name: "Kendua" },
          { name: "Madan" },
          { name: "Mohanganj" },
          { name: "Purbadhala" }
        ]
      },
      {
        name: "Sherpur",
        thanas: [
          { name: "Sherpur Sadar" },
          { name: "Jhenaigati" },
          { name: "Nakla" },
          { name: "Nalitabari" },
          { name: "Sreebardi" }
        ]
      }
    ]
  }
]
