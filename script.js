"use strict";

// ========== 問題データ（ここに足すだけで問題を増やせます） ==========
const QUESTIONS = [
  // ----- 日本史（大学受験レベル）100問 -----
  { label: "【日本史・古代】", q: "卑弥呼が魏に使いを送った年は？", choices: ["239年", "57年", "478年"], answer: 0, explain: "239年（景初3年）、卑弥呼は魏に遣使し「親魏倭王」の称号を受けた" },
  { label: "【日本史・古代】", q: "宋に上表文を送った倭の五王の「武」にあたるとされる天皇は？", choices: ["継体天皇", "仁徳天皇", "雄略天皇"], answer: 2, explain: "埼玉の稲荷山古墳出土の鉄剣の「ワカタケル大王」も雄略天皇とされる" },
  { label: "【日本史・古代】", q: "日本に仏教を伝えた百済の王は？", choices: ["武寧王", "聖明王", "近肖古王"], answer: 1, explain: "聖明王（聖王）が欽明天皇のときに仏像・経典を贈った（538年説・552年説）" },
  { label: "【日本史・古代】", q: "仏教の受容をめぐって蘇我馬子と争い、587年に滅ぼされた豪族は？", choices: ["中臣氏", "物部氏", "大伴氏"], answer: 1, explain: "物部守屋が蘇我馬子らに滅ぼされた" },
  { label: "【日本史・古代】", q: "小野妹子が持参した国書を読んで怒ったとされる隋の皇帝は？", choices: ["文帝", "煬帝", "太宗"], answer: 1, explain: "607年、「日出づる処の天子」の国書を受け取った隋の煬帝は不快感を示した" },
  { label: "【日本史・古代】", q: "663年の白村江の戦いで日本（倭）が敗れた相手は？", choices: ["高句麗・渤海", "唐・新羅連合軍", "元・高麗連合軍"], answer: 1, explain: "百済復興を支援したが敗北。この後、防衛のため水城や大野城を築いた" },
  { label: "【日本史・古代】", q: "壬申の乱（672年）に勝利し、翌年に即位した天皇は？", choices: ["天智天皇", "持統天皇", "天武天皇"], answer: 2, explain: "大海人皇子が大友皇子を破り、天武天皇として即位した" },
  { label: "【日本史・古代】", q: "694年に持統天皇が遷都した都は？", choices: ["平城京", "藤原京", "難波宮"], answer: 1, explain: "中国式の条坊制をもつ最初の本格的な都城" },
  { label: "【日本史・古代】", q: "刑部親王・藤原不比等らが編纂し、701年に完成した法典は？", choices: ["養老律令", "近江令", "大宝律令"], answer: 2, explain: "律令国家の基本法。のち718年ごろに養老律令がつくられた" },
  { label: "【日本史・古代】", q: "710年に平城京へ遷都したときの天皇は？", choices: ["持統天皇", "元正天皇", "元明天皇"], answer: 2, explain: "元明天皇のとき唐の長安にならった平城京に都を移した" },
  { label: "【日本史・古代】", q: "723年、長屋王政権が開墾を奨励するために出した法は？", choices: ["班田収授法", "三世一身法", "墾田永年私財法"], answer: 1, explain: "新しい灌漑施設による開墾は三世、既存のものは本人一代の保有を認めた" },
  { label: "【日本史・古代】", q: "743年に出され、開墾地の永久私有を認めて荘園発生のきっかけとなった法は？", choices: ["三世一身法", "口分田班給令", "墾田永年私財法"], answer: 2, explain: "聖武天皇のとき、橘諸兄政権が出した" },
  { label: "【日本史・古代】", q: "国分寺建立の詔（741年）と大仏造立の詔（743年）を出した天皇は？", choices: ["桓武天皇", "聖武天皇", "孝謙天皇"], answer: 1, explain: "仏教の力で国家を守る鎮護国家思想にもとづく" },
  { label: "【日本史・古代】", q: "唐から渡来して戒律を伝え、唐招提寺を開いた僧は？", choices: ["行基", "最澄", "鑑真"], answer: 2, explain: "何度も失敗しながら753年に来日した" },
  { label: "【日本史・古代】", q: "784年、桓武天皇が平城京から遷都した都は？", choices: ["長岡京", "難波宮", "恭仁京"], answer: 0, explain: "のち794年に平安京へ再遷都した" },
  { label: "【日本史・古代】", q: "空海が高野山に開いた真言宗の総本山は？", choices: ["金剛峯寺", "延暦寺", "園城寺"], answer: 0, explain: "最澄は比叡山に延暦寺を開き天台宗を伝えた" },
  { label: "【日本史・古代】", q: "嵯峨天皇が薬子の変（810年）に際して設置した、天皇直属の機関は？", choices: ["蔵人所", "検非違使", "勘解由使"], answer: 0, explain: "秘書的な役割を果たし、長官は蔵人頭" },
  { label: "【日本史・古代】", q: "宇多天皇のときの阿衡の紛議で、関白としての権威を示した人物は？", choices: ["藤原基経", "藤原良房", "藤原時平"], answer: 0, explain: "基経の抗議により、天皇は詔を撤回した" },
  { label: "【日本史・古代】", q: "894年、遣唐使の派遣の停止を建議した人物は？", choices: ["菅原道真", "小野篁", "藤原時平"], answer: 0, explain: "唐の衰退と渡航の危険が理由とされる" },
  { label: "【日本史・古代】", q: "939年に下総で反乱を起こし、「新皇」と称した人物は？", choices: ["平将門", "平忠常", "藤原純友"], answer: 0, explain: "同じころ瀬戸内海では藤原純友が反乱を起こした（承平・天慶の乱）" },
  { label: "【日本史・古代】", q: "「この世をば わが世とぞ思ふ 望月の…」の和歌を詠んだとされる人物は？", choices: ["藤原良房", "藤原頼通", "藤原道長"], answer: 2, explain: "三人の娘を后にして摂関政治の全盛期を築いた" },
  { label: "【日本史・古代】", q: "延久の荘園整理令（1069年）を出し、記録荘園券契所を設けた天皇は？", choices: ["白河天皇", "後白河天皇", "後三条天皇"], answer: 2, explain: "藤原氏と距離のある天皇で、摂関家の荘園にもメスを入れた" },
  { label: "【日本史・古代】", q: "1086年に譲位後も政治を行う院政を始めた上皇は？", choices: ["白河上皇", "鳥羽上皇", "後白河上皇"], answer: 0, explain: "堀河天皇に譲位して院政を開始した" },
  { label: "【日本史・古代】", q: "保元の乱（1156年）に敗れて讃岐に流された上皇は？", choices: ["後白河上皇", "後鳥羽上皇", "崇徳上皇"], answer: 2, explain: "後白河天皇方が勝利し、平清盛・源義朝が活躍した" },
  { label: "【日本史・古代】", q: "平治の乱（1159年）に敗れ、尾張で討たれた武将は？", choices: ["源為義", "源義朝", "源頼政"], answer: 1, explain: "勝った平清盛が武士として台頭する契機となった" },
  { label: "【日本史・古代】", q: "平清盛が日宋貿易のために修築した、摂津の港は？", choices: ["大輪田泊", "博多津", "坊津"], answer: 0, explain: "現在の神戸港付近。清盛は瀬戸内海航路を整備した" },
  { label: "【日本史・中世】", q: "1185年、源頼朝に守護・地頭の設置を認めた人物は？", choices: ["後鳥羽上皇", "後白河法皇", "安徳天皇"], answer: 1, explain: "源義経が頼朝に背いたことを受け、頼朝が朝廷に認めさせた" },
  { label: "【日本史・中世】", q: "承久の乱（1221年）のときの鎌倉幕府の執権は？", choices: ["北条義時", "北条泰時", "北条時政"], answer: 0, explain: "後鳥羽上皇は義時追討の院宣を出したが敗れ、隠岐に流された" },
  { label: "【日本史・中世】", q: "承久の乱後、朝廷の監視などのため京都に置かれた幕府の機関は？", choices: ["京都守護", "鎮西探題", "六波羅探題"], answer: 2, explain: "北条氏一門が任命された" },
  { label: "【日本史・中世】", q: "1232年、御成敗式目（貞永式目）を制定した執権は？", choices: ["北条時宗", "北条泰時", "北条時頼"], answer: 1, explain: "武家社会の慣習や道理にもとづく最初の武家法" },
  { label: "【日本史・中世】", q: "1247年の宝治合戦で執権北条時頼に滅ぼされた有力御家人は？", choices: ["梶原景時", "三浦泰村", "和田義盛"], answer: 1, explain: "この後、北条氏の権力がさらに強まった" },
  { label: "【日本史・中世】", q: "1285年の霜月騒動で、内管領平頼綱に滅ぼされた有力御家人は？", choices: ["比企能員", "安達泰盛", "三浦泰村"], answer: 1, explain: "得宗専制政治が強まるきっかけとなった" },
  { label: "【日本史・中世】", q: "1297年に永仁の徳政令を出した鎌倉幕府の執権は？", choices: ["北条時宗", "北条高時", "北条貞時"], answer: 2, explain: "御家人の窮乏を救うため、売却地の無償返却などを命じた" },
  { label: "【日本史・中世】", q: "1333年に鎌倉を攻め落とし、北条氏を滅ぼした武将は？", choices: ["新田義貞", "足利尊氏", "楠木正成"], answer: 0, explain: "同じころ足利尊氏は京都の六波羅探題を攻略した" },
  { label: "【日本史・中世】", q: "建武の新政で、所領をめぐる訴訟を扱うために設けられた機関は？", choices: ["問注所", "記録所", "雑訴決断所"], answer: 2, explain: "記録所は重要政務を扱った" },
  { label: "【日本史・中世】", q: "観応の擾乱（1350〜52年）で、足利尊氏と争った弟は？", choices: ["足利義詮", "足利直義", "新田義貞"], answer: 1, explain: "尊氏の執事・高師直と直義の対立が背景にあった" },
  { label: "【日本史・中世】", q: "1392年、南北朝の合一を実現した室町幕府の将軍は？", choices: ["足利義政", "足利尊氏", "足利義満"], answer: 2, explain: "南朝の後亀山天皇が北朝の後小松天皇に神器を渡した" },
  { label: "【日本史・中世】", q: "1399年の応永の乱で、足利義満に討たれた守護大名は？", choices: ["赤松満祐", "山名氏清", "大内義弘"], answer: 2, explain: "大内氏は周防・長門などを支配し、朝鮮との貿易で力をつけていた" },
  { label: "【日本史・中世】", q: "日明貿易（勘合貿易）を1411年に一時中断した将軍は？", choices: ["足利義教", "足利義持", "足利義政"], answer: 1, explain: "のち義教が再開した" },
  { label: "【日本史・中世】", q: "近江の馬借の蜂起に始まり、徳政を求めた最初の大規模な土一揆が起きた年は？", choices: ["1428年", "1441年", "1485年"], answer: 0, explain: "正長の土一揆。奈良の柳生の徳政碑文にも記録が残る" },
  { label: "【日本史・中世】", q: "嘉吉の変（1441年）で、6代将軍足利義教を殺害した守護大名は？", choices: ["畠山持国", "赤松満祐", "山名持豊"], answer: 1, explain: "直後に嘉吉の徳政一揆が起こった" },
  { label: "【日本史・中世】", q: "1485年、南山城の国人らが守護畠山氏の軍を撤退させ、約8年間自治を行った一揆は？", choices: ["加賀の一向一揆", "山城国一揆", "正長の土一揆"], answer: 1, explain: "国人が中心になり、国掟をつくって自治を行った" },
  { label: "【日本史・中世】", q: "応仁の乱（1467〜77年）で東軍の大将となった管領は？", choices: ["山名持豊", "細川勝元", "畠山義就"], answer: 1, explain: "西軍の大将は山名持豊（宗全）" },
  { label: "【日本史・中世】", q: "1488年に守護の富樫政親を倒し、約100年にわたり「百姓ノ持タル国」といわれた一揆は？", choices: ["加賀の一向一揆", "山城国一揆", "島原の乱"], answer: 0, explain: "浄土真宗（一向宗）の信者が中心となった" },
  { label: "【日本史・中世】", q: "堀越公方を倒して伊豆を奪い、戦国大名の先駆けとされる人物は？", choices: ["武田信玄", "斎藤道三", "北条早雲"], answer: 2, explain: "のち小田原を本拠として関東に勢力を広げた（後北条氏）" },
  { label: "【日本史・中世】", q: "分国法『今川仮名目録』を制定した戦国大名は？", choices: ["朝倉孝景", "今川義元", "今川氏親"], answer: 2, explain: "のち子の義元が追加法を加えた" },
  { label: "【日本史・中世】", q: "『秋冬山水図』『天橋立図』を描いた水墨画の大成者は？", choices: ["雪村", "狩野永徳", "雪舟"], answer: 2, explain: "明に渡って水墨画を学んだ" },
  { label: "【日本史・中世】", q: "書院造の代表的遺構で、足利義政が建てた慈照寺（銀閣）にある建物は？", choices: ["東求堂同仁斎", "鹿苑寺金閣", "大徳寺大仙院"], answer: 0, explain: "畳を敷きつめ、違い棚・付書院などを備える" },
  { label: "【日本史・中世】", q: "南朝の正統性を主張した『神皇正統記』を著した人物は？", choices: ["北畠親房", "慈円", "吉田兼好"], answer: 0, explain: "常陸の小田城などで南朝側の勢力拡大に努めた" },
  { label: "【日本史・中世】", q: "『教行信証』を著し、浄土真宗を開いたとされる僧は？", choices: ["親鸞", "一遍", "法然"], answer: 0, explain: "悪人正機を説いた" },
  { label: "【日本史・近世】", q: "1543年、ポルトガル人によって鉄砲が伝えられた島は？", choices: ["五島列島", "種子島", "屋久島"], answer: 1, explain: "領主の種子島時堯が購入し、のち堺・国友などで生産された" },
  { label: "【日本史・近世】", q: "1549年に鹿児島に来航し、キリスト教を伝えた宣教師は？", choices: ["フランシスコ＝ザビエル", "ヴァリニャーノ", "ルイス＝フロイス"], answer: 0, explain: "イエズス会の創設メンバーの一人" },
  { label: "【日本史・近世】", q: "1560年の桶狭間の戦いで織田信長に敗れた駿河の大名は？", choices: ["武田信玄", "今川義元", "斎藤義龍"], answer: 1, explain: "この勝利で信長は台頭した" },
  { label: "【日本史・近世】", q: "1575年の長篠合戦で織田・徳川連合軍に敗れた武将は？", choices: ["今川氏真", "上杉謙信", "武田勝頼"], answer: 2, explain: "鉄砲を使った戦術で知られる" },
  { label: "【日本史・近世】", q: "織田信長が1571年に焼き打ちにした寺院は？", choices: ["延暦寺", "金剛峯寺", "本願寺"], answer: 0, explain: "浅井・朝倉氏を支援したことが理由とされる" },
  { label: "【日本史・近世】", q: "天正遣欧使節を企画・派遣したイエズス会の宣教師は？", choices: ["ヴァリニャーノ", "ザビエル", "ロドリゲス"], answer: 0, explain: "大友宗麟・大村純忠・有馬晴信の名で少年使節がローマへ向かった" },
  { label: "【日本史・近世】", q: "太閤検地で全国的に統一された、土地の生産力を表す基準は？", choices: ["貫高", "石高", "反別"], answer: 1, explain: "石高にもとづいて年貢や軍役が課された" },
  { label: "【日本史・近世】", q: "関ヶ原の戦い（1600年）で、西軍から寝返って東軍を勝利に導いた武将は？", choices: ["小早川秀秋", "毛利輝元", "宇喜多秀家"], answer: 0, explain: "松尾山に布陣していたが、開戦後に東軍へ寝返った" },
  { label: "【日本史・近世】", q: "武家諸法度（元和令）を起草した臨済宗の僧は？", choices: ["金地院崇伝", "天海", "林羅山"], answer: 0, explain: "1615年、大坂夏の陣のあとに発布された" },
  { label: "【日本史・近世】", q: "紫衣事件（1627年）で幕府に抗議して処罰された大徳寺の僧は？", choices: ["隠元", "一休", "沢庵"], answer: 2, explain: "後水尾天皇は幕府に抗議して譲位した" },
  { label: "【日本史・近世】", q: "1641年にオランダ商館が平戸から移された場所は？", choices: ["出島", "浦賀", "唐人屋敷"], answer: 0, explain: "鎖国体制の完成とされる" },
  { label: "【日本史・近世】", q: "4代将軍徳川家綱を補佐した会津藩主は？", choices: ["柳沢吉保", "酒井忠清", "保科正之"], answer: 2, explain: "末期養子の禁の緩和など、文治政治への転換を進めた" },
  { label: "【日本史・近世】", q: "正徳の治で、新井白石らが長崎貿易を制限するため1715年に出した法令は？", choices: ["公事方御定書", "武家諸法度", "海舶互市新例"], answer: 2, explain: "金銀の海外流出を防ぐことが目的" },
  { label: "【日本史・近世】", q: "享保の改革で導入された、役職の基準石高に満たない者に在職中だけ不足分を補う制度は？", choices: ["相対済し令", "上げ米", "足高の制"], answer: 2, explain: "人材登用を進めつつ、出費を抑える狙いがあった" },
  { label: "【日本史・近世】", q: "享保の改革で編纂された、裁判・刑罰の基準となる法典は？", choices: ["御成敗式目", "公事方御定書", "武家諸法度"], answer: 1, explain: "1742年に完成した" },
  { label: "【日本史・近世】", q: "田沼意次が1772年に発行した、金貨の単位で通用する計数銀貨は？", choices: ["南鐐二朱銀", "天保通宝", "元禄小判"], answer: 0, explain: "銀貨を金貨の単位に統一しようとする試み" },
  { label: "【日本史・近世】", q: "松平定信が1790年に出した、朱子学以外の講義を禁じた法令は？", choices: ["寛政異学の禁", "上知令", "棄捐令"], answer: 0, explain: "昌平坂学問所で朱子学を正学とした" },
  { label: "【日本史・近世】", q: "寛政の改革で、旗本・御家人の札差からの借金を帳消しにした法令は？", choices: ["棄捐令", "上げ米", "人返しの法"], answer: 0, explain: "1789年に出された" },
  { label: "【日本史・近世】", q: "水野忠邦が1843年に出し、反対で撤回された、江戸・大坂周辺を幕領にしようとした法令は？", choices: ["人返しの法", "株仲間解散令", "上知令"], answer: 2, explain: "大名・旗本の強い反対で実行できなかった" },
  { label: "【日本史・近世】", q: "1839年の蛮社の獄で処罰された、『慎機論』を著した三河田原藩の家老は？", choices: ["渡辺崋山", "佐久間象山", "高野長英"], answer: 0, explain: "高野長英は『戊戌夢物語』を著した" },
  { label: "【日本史・近世】", q: "アヘン戦争での清の敗北を受け、1842年に異国船打払令を緩和した法令は？", choices: ["日米和親条約", "天保の薪水給与令", "異国船打払令"], answer: 1, explain: "来航した外国船に燃料や食料を与えるよう命じた" },
  { label: "【日本史・近世】", q: "1837年に大坂で挙兵し、幕府の飢饉対策を批判した陽明学者は？", choices: ["大塩平八郎", "渡辺崋山", "高野長英"], answer: 0, explain: "もと大坂町奉行所の与力で、幕府に衝撃を与えた" },
  { label: "【日本史・近世】", q: "1860年の桜田門外の変で暗殺された大老は？", choices: ["井伊直弼", "堀田正睦", "安藤信正"], answer: 0, explain: "安政の大獄などの強硬策への反発が背景" },
  { label: "【日本史・近世】", q: "1862年の坂下門外の変で襲撃された老中は？", choices: ["井伊直弼", "安藤信正", "阿部正弘"], answer: 1, explain: "公武合体政策で和宮降嫁を進めていた" },
  { label: "【日本史・近世】", q: "1866年、薩摩藩と長州藩の同盟（薩長同盟）を仲介した土佐藩出身の人物は？", choices: ["坂本龍馬", "勝海舟", "岩崎弥太郎"], answer: 0, explain: "中岡慎太郎とともに斡旋した" },
  { label: "【日本史・近世】", q: "1867年、将軍徳川慶喜に大政奉還を勧めた前土佐藩主は？", choices: ["松平慶永", "山内豊信", "島津斉彬"], answer: 1, explain: "後藤象二郎らの建白を受け入れて慶喜が決断した" },
  { label: "【日本史・近代】", q: "五箇条の誓文の原案（議事之体大意）を起草した人物は？", choices: ["西周", "福沢諭吉", "由利公正"], answer: 2, explain: "のち福岡孝弟・木戸孝允が修正した" },
  { label: "【日本史・近代】", q: "1869年の版籍奉還のあと、旧藩主が任命された職は？", choices: ["知藩事", "県令", "府知事"], answer: 0, explain: "廃藩置県（1871年）で免職となった" },
  { label: "【日本史・近代】", q: "1873年の地租改正条例で定められた、地租の税率は？", choices: ["収穫高の3割", "地価の3％", "地価の10％"], answer: 1, explain: "現金で納める定額金納に改められた" },
  { label: "【日本史・近代】", q: "民撰議院設立建白書（1874年）を提出した人物の一人は？", choices: ["伊藤博文", "大隈重信", "板垣退助"], answer: 2, explain: "征韓論に敗れて下野した参議らが提出した" },
  { label: "【日本史・近代】", q: "明治十四年の政変（1881年）で罷免された参議は？", choices: ["板垣退助", "井上馨", "大隈重信"], answer: 2, explain: "同時に国会開設の勅諭が出された" },
  { label: "【日本史・近代】", q: "1882年、松方正義の主導で設立された中央銀行は？", choices: ["日本銀行", "第一国立銀行", "横浜正金銀行"], answer: 0, explain: "松方財政の一環として兌換制度を整えた" },
  { label: "【日本史・近代】", q: "1876年の日朝修好条規で、日本が朝鮮に認めさせた不平等な内容は？", choices: ["朝鮮の宗主国を日本とする", "賠償金二億両の支払い", "日本の領事裁判権"], answer: 2, explain: "江華島事件を口実に結ばれた" },
  { label: "【日本史・近代】", q: "伊藤博文が1882年からの憲法調査で師事した、ウィーン大学の国家学者は？", choices: ["ボアソナード", "シュタイン", "グナイスト"], answer: 1, explain: "君主権の強いプロイセン流の憲法を学んだ" },
  { label: "【日本史・近代】", q: "下関条約（1895年）の直後に、日本に遼東半島の返還を要求した三国は？", choices: ["ロシア・イギリス・ドイツ", "ロシア・ドイツ・フランス", "イギリス・アメリカ・フランス"], answer: 1, explain: "三国干渉。日本は返還を受け入れた" },
  { label: "【日本史・近代】", q: "1905年のポーツマス条約でロシアから日本に譲られた領土は？", choices: ["南樺太", "台湾", "澎湖諸島"], answer: 0, explain: "日本の韓国に対する指導権も認められた" },
  { label: "【日本史・近代】", q: "1911年に日米通商航海条約を改正し、関税自主権の完全回復を実現した外務大臣は？", choices: ["寺島宗則", "小村寿太郎", "陸奥宗光"], answer: 1, explain: "陸奥宗光は1894年に領事裁判権の撤廃に成功した" },
  { label: "【日本史・近代】", q: "1910年の韓国併合の後に置かれた朝鮮総督府の初代総督は？", choices: ["伊藤博文", "山県有朋", "寺内正毅"], answer: 2, explain: "伊藤博文は韓国統監府の初代統監" },
  { label: "【日本史・近代】", q: "1912〜13年、「閥族打破・憲政擁護」を掲げて第3次桂太郎内閣を倒した運動は？", choices: ["普選運動", "第一次護憲運動", "自由民権運動"], answer: 1, explain: "尾崎行雄や犬養毅らが中心となった（大正政変）" },
  { label: "【日本史・近代】", q: "1915年、日本が二十一カ条の要求を突きつけた相手の中国政府の大総統は？", choices: ["蔣介石", "孫文", "袁世凱"], answer: 2, explain: "日本は最後通牒を出して要求の大部分を認めさせた" },
  { label: "【日本史・近代】", q: "1918年の米騒動で総辞職した内閣は？", choices: ["寺内正毅内閣", "大隈重信内閣", "原敬内閣"], answer: 0, explain: "後継は本格的な政党内閣の原敬内閣" },
  { label: "【日本史・近代】", q: "1925年に普通選挙法を成立させた内閣の首相は？", choices: ["若槻礼次郎", "加藤高明", "原敬"], answer: 1, explain: "満25歳以上の男子に選挙権を与えた。同年に治安維持法も成立した" },
  { label: "【日本史・近代】", q: "1932年の五・一五事件で、海軍青年将校らに暗殺された首相は？", choices: ["高橋是清", "犬養毅", "浜口雄幸"], answer: 1, explain: "政党内閣の時代が終わるきっかけとなった" },
  { label: "【日本史・近代】", q: "1931年の満州事変のきっかけとなった、関東軍による鉄道爆破事件は？", choices: ["盧溝橋事件", "柳条湖事件", "張作霖爆殺事件"], answer: 1, explain: "関東軍が自作自演し、中国軍の仕業と主張した" },
  { label: "【日本史・近代】", q: "1938年、近衛文麿内閣のときに成立した、戦時の人的・物的資源の統制運用を政府に認めた法律は？", choices: ["治安維持法", "国家総動員法", "国民徴用令"], answer: 1, explain: "議会の承認なしに勅令で統制できるとした" },
  { label: "【日本史・近代】", q: "1940年に日本がドイツ・イタリアと結んだ軍事同盟は？", choices: ["日独伊三国同盟", "日独防共協定", "日ソ中立条約"], answer: 0, explain: "アメリカを牽制する目的があったが、対米関係は悪化した" },
  { label: "【日本史・現代】", q: "GHQの指令による農地改革で、大幅に増加した農家は？", choices: ["自作農", "小作農", "地主"], answer: 0, explain: "地主の土地を国が買い上げ、小作人に安く売り渡した" },
  { label: "【日本史・現代】", q: "1951年にサンフランシスコ平和条約に調印した首相は？", choices: ["岸信介", "鳩山一郎", "吉田茂"], answer: 2, explain: "同日に日米安全保障条約も結ばれた" },
  { label: "【日本史・現代】", q: "1956年に日ソ共同宣言に調印し、日本の国際連合加盟を実現した首相は？", choices: ["吉田茂", "岸信介", "鳩山一郎"], answer: 2, explain: "ソ連との国交が回復し、ソ連の拒否権が解消された" },
  { label: "【日本史・現代】", q: "1972年に日中共同声明に調印し、日中国交正常化を実現した首相は？", choices: ["福田赳夫", "田中角栄", "佐藤栄作"], answer: 1, explain: "日中平和友好条約は1978年（福田赳夫内閣）" },

  // ----- 世界史（大学受験レベル）100問 -----
  { label: "【世界史・古代】", q: "楔形文字を発明したとされる、メソポタミア南部の民族は？", choices: ["シュメール人", "ヒッタイト人", "フェニキア人"], answer: 0, explain: "粘土板に刻まれた楔形文字は、のちアッカド人やバビロニア人にも受け継がれた" },
  { label: "【世界史・古代】", q: "前7世紀に、初めてオリエント世界を統一した国は？", choices: ["ヒッタイト", "新バビロニア", "アッシリア"], answer: 2, explain: "鉄製の武器と戦車、強力な軍事力で支配し、都はニネヴェに置かれた" },
  { label: "【世界史・古代】", q: "アケメネス朝のダレイオス1世が、全国を州に分けて置いた総督は？", choices: ["エフォロイ", "ノモス", "サトラップ"], answer: 2, explain: "「王の目」「王の耳」と呼ばれる監察官が各州を監視した" },
  { label: "【世界史・古代】", q: "前480年のサラミスの海戦で、ギリシア艦隊を率いたアテネの将軍は？", choices: ["ミルティアデス", "ペリクレス", "テミストクレス"], answer: 2, explain: "ミルティアデスは前490年のマラトンの戦いの指揮官" },
  { label: "【世界史・古代】", q: "ペロポネソス戦争（前431〜前404年）で、アテネを破ったポリスは？", choices: ["コリントス", "テーベ", "スパルタ"], answer: 2, explain: "スパルタはペルシアの援助を受けて海軍を整え、アテネを降伏させた" },
  { label: "【世界史・古代】", q: "アレクサンドロス大王の東方遠征で滅ぼされたペルシアの王朝は？", choices: ["ササン朝", "アケメネス朝", "セレウコス朝"], answer: 1, explain: "前331年のガウガメラの戦いで、ダレイオス3世を破った" },
  { label: "【世界史・古代】", q: "ヘレニズム時代に、王立研究所ムセイオンが置かれたアレクサンドリアを都としたエジプトの王朝は？", choices: ["セレウコス朝", "アンティゴノス朝", "プトレマイオス朝"], answer: 2, explain: "クレオパトラ7世を最後に、前30年にローマに併合された" },
  { label: "【世界史・古代】", q: "第2次ポエニ戦争のザマの戦い（前202年）で、ハンニバルを破ったローマの将軍は？", choices: ["マリウス", "スキピオ", "カエサル"], answer: 1, explain: "この勝利でローマは西地中海の覇権を握った" },
  { label: "【世界史・古代】", q: "前2世紀後半に、土地改革を試みて失敗したローマの護民官の兄弟は？", choices: ["スキピオ兄弟", "グラックス兄弟", "ゲルマニクス兄弟"], answer: 1, explain: "有力者の私有地を制限して中小農民を再建しようとした" },
  { label: "【世界史・古代】", q: "前60年に第1回三頭政治を結んだ一人で、のちにガリア遠征を行って独裁官となったのは？", choices: ["アントニウス", "カエサル", "オクタウィアヌス"], answer: 1, explain: "他の二人はポンペイウスとクラッスス" },
  { label: "【世界史・古代】", q: "前27年に元老院から「アウグストゥス」の称号を受け、帝政を始めた人物は？", choices: ["アントニウス", "ブルートゥス", "オクタウィアヌス"], answer: 2, explain: "前31年のアクティウムの海戦で、アントニウスとクレオパトラを破った" },
  { label: "【世界史・古代】", q: "313年のミラノ勅令でキリスト教を公認したローマ皇帝は？", choices: ["ディオクレティアヌス帝", "テオドシウス帝", "コンスタンティヌス帝"], answer: 2, explain: "のち330年に都をビザンティウム（コンスタンティノープル）に移した" },
  { label: "【世界史・古代】", q: "392年にキリスト教を国教とし、395年の死去後にローマ帝国が東西に分裂した皇帝は？", choices: ["ユスティニアヌス帝", "コンスタンティヌス帝", "テオドシウス帝"], answer: 2, explain: "死に際して、帝国を二人の息子に分け与えた" },
  { label: "【世界史・古代】", q: "325年のニケーア公会議で、正統とされた教派は？", choices: ["アタナシウス派", "ネストリウス派", "アリウス派"], answer: 0, explain: "キリストを神と同質とする説が正統とされ、アリウス派は異端とされた" },
  { label: "【世界史・古代】", q: "375年に西進してゲルマン人の大移動のきっかけをつくった、騎馬遊牧民は？", choices: ["マジャール人", "フン人", "アヴァール人"], answer: 1, explain: "ゲルマン人の一派の西ゴート人が圧迫されて、ローマ領内に移動した" },
  { label: "【世界史・古代】", q: "476年に西ローマ皇帝を退位させた、ゲルマン人傭兵隊長は？", choices: ["オドアケル", "アラリック", "テオドリック"], answer: 0, explain: "西ローマ帝国はこの年に滅亡したとされる" },
  { label: "【世界史・古代】", q: "メロヴィング朝を創始し、アタナシウス派に改宗したフランク王は？", choices: ["カール＝マルテル", "クローヴィス", "ピピン"], answer: 1, explain: "ローマ人貴族や教会の支持を得ることができた" },
  { label: "【世界史・古代】", q: "732年のトゥール・ポワティエ間の戦いで、ウマイヤ朝軍を破ったフランクの宮宰は？", choices: ["カール大帝", "カール＝マルテル", "ピピン"], answer: 1, explain: "イスラーム勢力の西ヨーロッパへの進出を止めた" },
  { label: "【世界史・中世】", q: "800年、カール大帝に西ローマ皇帝の冠を授けた教皇は？", choices: ["グレゴリウス7世", "ウルバヌス2世", "レオ3世"], answer: 2, explain: "ローマ＝カトリック世界の成立を示す出来事とされる" },
  { label: "【世界史・中世】", q: "870年のメルセン条約などによって成立した、現在のドイツの原型となった王国は？", choices: ["西フランク", "東フランク", "中部フランク"], answer: 1, explain: "西フランクは現在のフランス、中部フランクはイタリアの原型" },
  { label: "【世界史・中世】", q: "962年に教皇から帝冠を受け、神聖ローマ帝国の起源をつくった東フランク王は？", choices: ["フリードリヒ1世", "オットー1世", "ハインリヒ4世"], answer: 1, explain: "マジャール人をレヒフェルトの戦いで破ったことでも知られる" },
  { label: "【世界史・中世】", q: "1077年のカノッサの屈辱で、教皇に破門の解除を求めた神聖ローマ皇帝は？", choices: ["ハインリヒ4世", "フリードリヒ2世", "オットー1世"], answer: 0, explain: "叙任権闘争のなかで、教皇グレゴリウス7世と対立した" },
  { label: "【世界史・中世】", q: "1095年のクレルモン宗教会議で十字軍を提唱した教皇は？", choices: ["インノケンティウス3世", "グレゴリウス7世", "ウルバヌス2世"], answer: 2, explain: "ビザンツ皇帝の救援要請を受けて提唱した" },
  { label: "【世界史・中世】", q: "第4回十字軍が、目的を変えて占領したビザンツ帝国の都は？", choices: ["エルサレム", "コンスタンティノープル", "ダマスクス"], answer: 1, explain: "ヴェネツィア商人の思惑が働き、ラテン帝国が建てられた" },
  { label: "【世界史・中世】", q: "1215年に大憲章（マグナ＝カルタ）を認めさせられたイギリス王は？", choices: ["ヘンリ2世", "エドワード1世", "ジョン王"], answer: 2, explain: "貴族が王権の制限を求め、課税には貴族の同意が必要とされた" },
  { label: "【世界史・中世】", q: "百年戦争が終わった1453年の時点で、イギリスが大陸に唯一保持していた拠点は？", choices: ["ルーアン", "カレー", "ボルドー"], answer: 1, explain: "カレーは1558年にフランスに奪回された" },
  { label: "【世界史・中世】", q: "1381年に、イギリスで人頭税に反対して起こった農民反乱の指導者は？", choices: ["ジャック＝ケード", "トマス＝ミュンツァー", "ワット＝タイラー"], answer: 2, explain: "聖職者ジョン＝ボールの思想の影響も受けた" },
  { label: "【世界史・中世】", q: "6世紀に『ローマ法大全』を編纂させ、ハギア＝ソフィア聖堂を再建したビザンツ皇帝は？", choices: ["レオン3世", "ユスティニアヌス帝", "ヘラクレイオス1世"], answer: 1, explain: "ビザンツ帝国の最盛期を築いた" },
  { label: "【世界史・中世】", q: "726年に聖像禁止令を出し、ローマ教会との対立を深めたビザンツ皇帝は？", choices: ["ヘラクレイオス1世", "ユスティニアヌス帝", "レオン3世"], answer: 2, explain: "偶像崇拝を禁じるイスラームへの対抗の意味もあったとされる" },
  { label: "【世界史・中世】", q: "622年にムハンマドがメッカからメディナへ移った出来事は？", choices: ["ヒジュラ（聖遷）", "ジハード", "ハッジ"], answer: 0, explain: "この年がイスラーム暦の紀元元年とされる" },
  { label: "【世界史・中世】", q: "シーア派が初代イマームとして重んじる、ムハンマドの従弟で娘婿にあたる人物は？", choices: ["ムアーウィヤ", "アリー", "アブー＝バクル"], answer: 1, explain: "第4代の正統カリフでもあった" },
  { label: "【世界史・中世】", q: "762年に新都バグダードの建設を始めたアッバース朝のカリフは？", choices: ["ハールーン＝アッラシード", "マンスール", "アブー＝アルアッバース"], answer: 1, explain: "アッバース朝の第2代カリフ。バグダードは東西交易の中心として栄えた" },
  { label: "【世界史・中世】", q: "751年のタラス河畔の戦いで、アッバース朝が破った王朝は？", choices: ["唐", "吐蕃", "隋"], answer: 0, explain: "捕虜を通じて、製紙法が西方に伝わったとされる" },
  { label: "【世界史・中世】", q: "1187年にエルサレムを奪回した、アイユーブ朝の建国者は？", choices: ["バイバルス", "ハールーン＝アッラシード", "サラディン"], answer: 2, explain: "正式名はサラーフ＝アッディーン。第3回十字軍と戦った" },
  { label: "【世界史・中世】", q: "1055年にバグダードに入り、カリフからスルタンの称号を授かったセルジューク朝の君主は？", choices: ["トゥグリル＝ベク", "マリク＝シャー", "アルプ＝アルスラーン"], answer: 0, explain: "スルタンは世俗の君主を指す称号" },
  { label: "【世界史・中世】", q: "1453年にビザンツ帝国を滅ぼしたオスマン帝国のスルタンは？", choices: ["メフメト2世", "スレイマン1世", "セリム1世"], answer: 0, explain: "コンスタンティノープルを占領し、のちイスタンブルと呼ばれた" },
  { label: "【世界史・中世】", q: "1529年に第1次ウィーン包囲を行った、オスマン帝国の最盛期のスルタンは？", choices: ["スレイマン1世", "セリム1世", "メフメト2世"], answer: 0, explain: "1538年にはプレヴェザの海戦で地中海の制海権を握った" },
  { label: "【世界史・中世】", q: "北インド最初のイスラーム王朝で、デリー＝スルタン朝の最初の王朝は？", choices: ["トゥグルク朝", "奴隷王朝", "ロディー朝"], answer: 1, explain: "1206年に、アイバクがデリーを都に建てた" },
  { label: "【世界史・中世】", q: "1526年にパーニーパットの戦いでロディー朝を破り、ムガル帝国を建てた人物は？", choices: ["アクバル", "ティムール", "バーブル"], answer: 2, explain: "ティムールの子孫でチャガタイ＝ハン国の流れをくむ" },
  { label: "【世界史・中世】", q: "非ムスリムに課されていた人頭税ジズヤを廃止した、ムガル帝国の皇帝は？", choices: ["アウラングゼーブ", "シャー＝ジャハーン", "アクバル"], answer: 2, explain: "のちアウラングゼーブがジズヤを復活させた" },
  { label: "【世界史・中国】", q: "春秋時代に、管仲を登用して最初の覇者となった斉の君主は？", choices: ["文公", "勾践", "桓公"], answer: 2, explain: "「尊王攘夷」を掲げて諸侯の盟主となった" },
  { label: "【世界史・中国】", q: "秦の孝公に仕え、法家の立場から変法を行った人物は？", choices: ["李斯", "商鞅", "韓非"], answer: 1, explain: "秦が強国となる基礎を築いたが、のち車裂きの刑に処された" },
  { label: "【世界史・中国】", q: "秦の始皇帝が全国に施行した、中央から官吏を派遣して統治する制度は？", choices: ["封建制", "郡国制", "郡県制"], answer: 2, explain: "郡国制は、漢の高祖の時代に行われた制度" },
  { label: "【世界史・中国】", q: "前漢の武帝のとき、儒学を官学とするよう建言した人物は？", choices: ["賈誼", "董仲舒", "司馬遷"], answer: 1, explain: "儒学の五経博士が設置された" },
  { label: "【世界史・中国】", q: "武帝の命により、大月氏との同盟を目指して西域に向かった人物は？", choices: ["張騫", "玄奘", "班超"], answer: 0, explain: "同盟は実現しなかったが、西域の情報をもたらした" },
  { label: "【世界史・中国】", q: "25年に漢を再興して後漢を建てた光武帝の本名は？", choices: ["劉邦", "劉秀", "劉備"], answer: 1, explain: "王莽の新が滅びたあとの混乱を収め、洛陽に都を置いた" },
  { label: "【世界史・中国】", q: "184年に黄巾の乱を起こした、太平道の教祖は？", choices: ["陳勝", "張角", "張魯"], answer: 1, explain: "「蒼天已死、黄天当立」をスローガンに、後漢の衰退を早めた" },
  { label: "【世界史・中国】", q: "208年の赤壁の戦いで、曹操軍を破った孫権と同盟を結んだ人物は？", choices: ["劉備", "袁紹", "司馬懿"], answer: 0, explain: "諸葛亮の「天下三分の計」にもとづく同盟だった" },
  { label: "【世界史・中国】", q: "魏の文帝（曹丕）のときに始まった、官吏登用の制度は？", choices: ["九品中正", "郷挙里選", "科挙"], answer: 0, explain: "地方の中正官が人材を九等に評価して推薦したが、のち門閥貴族が有利になった" },
  { label: "【世界史・中国】", q: "北魏の孝文帝が485年に始めた、農民に土地を支給する制度は？", choices: ["均田制", "占田・課田法", "租調庸制"], answer: 0, explain: "のち隋・唐にも受け継がれた" },
  { label: "【世界史・中国】", q: "隋の文帝が始めた、試験による官吏登用制度は？", choices: ["科挙", "九品中正", "郷挙里選"], answer: 0, explain: "門閥貴族の力を抑えるねらいがあった" },
  { label: "【世界史・中国】", q: "755年に唐で反乱を起こした、節度使は？", choices: ["黄巣", "安禄山", "朱全忠"], answer: 1, explain: "玄宗が楊貴妃を寵愛していた時期の反乱で、唐の衰退の契機となった" },
  { label: "【世界史・中国】", q: "780年に楊炎の建議で施行された、夏と秋の2回に課税する唐の税制は？", choices: ["両税法", "一条鞭法", "租調庸制"], answer: 0, explain: "均田制の崩壊に対応して、現住地で資産に応じて課税した" },
  { label: "【世界史・中国】", q: "907年に唐を滅ぼし、後梁を建てた人物は？", choices: ["石敬瑭", "朱全忠", "趙匡胤"], answer: 1, explain: "黄巣の乱に加わったのち唐に降伏し、節度使となった" },
  { label: "【世界史・中国】", q: "北宋の神宗に登用されて新法を行った人物は？", choices: ["范仲淹", "王安石", "司馬光"], answer: 1, explain: "青苗法・市易法などで財政再建を図ったが、旧法党と対立した" },
  { label: "【世界史・中国】", q: "南宋で金との和平を主張した宰相は？", choices: ["秦檜", "韓侂冑", "岳飛"], answer: 0, explain: "1142年に淮河を国境とする和議を結び、金に臣下の礼をとった" },
  { label: "【世界史・中国】", q: "1279年に南宋を滅ぼした元の皇帝は？", choices: ["オゴタイ", "フビライ（クビライ）", "チンギス＝ハン"], answer: 1, explain: "1271年に国号を元と定め、大都を都とした" },
  { label: "【世界史・中国】", q: "明の洪武帝が皇帝権力を強化するために廃止した、元以来の中央官庁は？", choices: ["六部", "中書省", "軍機処"], answer: 1, explain: "宰相の胡惟庸の獄をきっかけに廃止し、六部を皇帝直属とした" },
  { label: "【世界史・中国】", q: "清の雍正帝のときに設けられた、皇帝の最高諮問機関は？", choices: ["軍機処", "中書省", "内閣大学士"], answer: 0, explain: "のち清の最高政務機関となった" },
  { label: "【世界史・中国】", q: "明の万暦年間に張居正が全国に拡大した、各種の税や徭役を銀で一括納入させる税制は？", choices: ["一条鞭法", "両税法", "地丁銀制"], answer: 0, explain: "銀による納税が広がり、のち清の地丁銀制につながった" },
  { label: "【世界史・近世近代】", q: "1555年のアウクスブルクの宗教和議で認められたことは？", choices: ["領民個人に信仰の自由を認めた", "カルヴァン派を公認した", "諸侯にルター派かカトリックかの選択を認めた"], answer: 2, explain: "「支配者の宗教がその地の宗教」という原則。個人の信仰の自由は認められなかった" },
  { label: "【世界史・近世近代】", q: "『キリスト教綱要』を著し、ジュネーヴで宗教改革を行った人物は？", choices: ["ルター", "カルヴァン", "ツヴィングリ"], answer: 1, explain: "予定説を唱え、勤勉な労働による蓄財を肯定する考えにつながった" },
  { label: "【世界史・近世近代】", q: "1534年に首長法（国王至上法）を出して、イギリス国教会を成立させた王は？", choices: ["エリザベス1世", "ヘンリ8世", "ヘンリ7世"], answer: 1, explain: "王妃との離婚問題で、教皇と対立したことが背景にある" },
  { label: "【世界史・近世近代】", q: "1588年にスペインの無敵艦隊（アルマダ）を破ったイギリスの女王は？", choices: ["エリザベス1世", "ヴィクトリア女王", "メアリ1世"], answer: 0, explain: "この勝利で、イギリスは海上での発展の基礎をつくった" },
  { label: "【世界史・近世近代】", q: "1648年のウェストファリア条約で、独立が国際的に承認された国は？", choices: ["オランダとスイス", "ポーランドとスウェーデン", "ベルギーとルクセンブルク"], answer: 0, explain: "三十年戦争の講和条約。神聖ローマ帝国内の諸侯の主権も認められた" },
  { label: "【世界史・近世近代】", q: "ピューリタン革命でチャールズ1世を処刑したのち、護国卿となった人物は？", choices: ["ウィリアム3世", "クロムウェル", "ピム"], answer: 1, explain: "鉄騎隊を率いて、1645年のネーズビーの戦いで王党派を破った" },
  { label: "【世界史・近世近代】", q: "1689年に権利の章典を承認した、イギリスの共同統治者は？", choices: ["ウィリアム3世とメアリ2世", "ジョージ1世とアン女王", "チャールズ2世とジェームズ2世"], answer: 0, explain: "名誉革命によって、議会主権にもとづく立憲君主制が確立した" },
  { label: "【世界史・近世近代】", q: "1685年にナントの王令を廃止し、ユグノーの国外流出を招いたフランス王は？", choices: ["ルイ13世", "アンリ4世", "ルイ14世"], answer: 2, explain: "ナントの王令は、1598年にアンリ4世が出していた" },
  { label: "【世界史・近世近代】", q: "ピョートル1世が北方戦争中の1703年に建設を始めた、新首都は？", choices: ["ペテルブルク", "キエフ", "モスクワ"], answer: 0, explain: "バルト海への進出の拠点とされた" },
  { label: "【世界史・近世近代】", q: "1740年にシュレジエンを奪い、啓蒙専制君主として知られるプロイセン王は？", choices: ["フリードリヒ＝ヴィルヘルム1世", "フリードリヒ2世", "ヨーゼフ2世"], answer: 1, explain: "オーストリア継承戦争・七年戦争を戦った" },
  { label: "【世界史・近世近代】", q: "1769年に蒸気機関を改良して、産業革命の動力革命を進めたイギリスの技術者は？", choices: ["ニューコメン", "スティーヴンソン", "ワット"], answer: 2, explain: "ニューコメンの蒸気機関を改良し、効率を高めた" },
  { label: "【世界史・近世近代】", q: "七年戦争後の1763年のパリ条約で、フランスがイギリスに譲った北米の地域は？", choices: ["テキサス", "カナダ", "メキシコ"], answer: 1, explain: "ミシシッピ川以東のルイジアナも、イギリスに割譲された" },
  { label: "【世界史・近世近代】", q: "アメリカ独立宣言（1776年）の起草の中心となった人物は？", choices: ["ワシントン", "ハミルトン", "ジェファソン"], answer: 2, explain: "ロックの社会契約説などの影響を受けた" },
  { label: "【世界史・近世近代】", q: "1794年のテルミドールのクーデタで失脚した、恐怖政治の指導者は？", choices: ["ロベスピエール", "マラー", "ダントン"], answer: 0, explain: "ジャコバン派の指導者で、翌日に処刑された" },
  { label: "【世界史・近世近代】", q: "1813年のライプツィヒの戦い（諸国民戦争）で、ナポレオンが敗れた相手は？", choices: ["イギリス・オランダ連合軍", "ロシア・プロイセン・オーストリアなどの連合軍", "スペイン・ポルトガル連合軍"], answer: 1, explain: "この敗北でナポレオンは退位し、エルバ島に流された" },
  { label: "【世界史・近世近代】", q: "ウィーン会議で議長を務め、保守的な体制の維持に努めたオーストリアの外相は？", choices: ["ビスマルク", "タレーラン", "メッテルニヒ"], answer: 2, explain: "正統主義を唱えたのはフランス代表のタレーラン" },
  { label: "【世界史・近世近代】", q: "1830年の七月革命で、フランスの王位に就いたオルレアン家の王は？", choices: ["ルイ＝フィリップ", "シャルル10世", "ルイ18世"], answer: 0, explain: "「七月王政」は、銀行家などの大資本家が支えた" },
  { label: "【世界史・近世近代】", q: "1846年に穀物法を廃止した、イギリスの首相は？", choices: ["パーマストン", "グラッドストン", "ピール"], answer: 2, explain: "反穀物法同盟の運動を受け、自由貿易への転換を進めた" },
  { label: "【世界史・近世近代】", q: "クリミア戦争の敗北を受けて、ロシア皇帝アレクサンドル2世が1861年に発布した改革は？", choices: ["農奴解放令", "十月宣言", "ストルイピン改革"], answer: 0, explain: "農奴は人格的に自由になったが、土地は有償だった" },
  { label: "【世界史・近世近代】", q: "1860年に赤シャツ隊（千人隊）を率いて両シチリア王国を征服し、サルデーニャ王に献上した人物は？", choices: ["マッツィーニ", "カヴール", "ガリバルディ"], answer: 2, explain: "翌1861年にイタリア王国が成立した" },
  { label: "【世界史・近世近代】", q: "1871年にヴェルサイユ宮殿で成立が宣言されたドイツ帝国の初代皇帝は？", choices: ["ヴィルヘルム1世", "ヴィルヘルム2世", "フリードリヒ3世"], answer: 0, explain: "プロイセン王が帝位を兼ね、宰相はビスマルクだった" },
  { label: "【世界史・近世近代】", q: "南北戦争中の1862年に成立した、西部の開拓者に土地を無償で与える法律は？", choices: ["ミズーリ協定", "カンザス・ネブラスカ法", "ホームステッド法"], answer: 2, explain: "西部の開拓農民を北部の支持層とする狙いがあった" },
  { label: "【世界史・近世近代】", q: "1898年にスーダンのファショダで衝突した国同士は？", choices: ["イギリスとフランス", "イギリスとドイツ", "フランスとドイツ"], answer: 0, explain: "フランスが譲歩し、のち1904年の英仏協商につながった" },
  { label: "【世界史・近世近代】", q: "1907年に成立した三国協商を構成した国は？", choices: ["イギリス・フランス・ロシア", "イギリス・フランス・イタリア", "ドイツ・オーストリア・イタリア"], answer: 0, explain: "ドイツ・オーストリア・イタリアは、三国同盟を結んでいた" },
  { label: "【世界史・現代】", q: "1918年にソヴィエト政権がドイツと結んだ、単独講和条約は？", choices: ["ヴェルサイユ条約", "ラパロ条約", "ブレスト＝リトフスク条約"], answer: 2, explain: "ソヴィエト政権は、第一次世界大戦から離脱した" },
  { label: "【世界史・現代】", q: "ウィルソンが十四カ条を発表した国で、議会の反対により国際連盟に加盟しなかった国は？", choices: ["アメリカ", "イギリス", "フランス"], answer: 0, explain: "上院がヴェルサイユ条約の批准を拒否した" },
  { label: "【世界史・現代】", q: "1921〜22年のワシントン会議で、中国の領土保全・門戸開放を確認した条約は？", choices: ["ロカルノ条約", "九カ国条約", "四カ国条約"], answer: 1, explain: "四カ国条約では、日英同盟の廃棄が決まった" },
  { label: "【世界史・現代】", q: "1925年のロカルノ条約の締結に尽力した、ドイツの外相は？", choices: ["ヒンデンブルク", "ブリアン", "シュトレーゼマン"], answer: 2, explain: "西欧の安全保障が確立し、ドイツは翌1926年に国際連盟に加盟した" },
  { label: "【世界史・現代】", q: "ニューディール政策で、テネシー川流域の開発を行った公社は？", choices: ["TVA（テネシー川流域開発公社）", "AAA（農業調整法）", "NRA（全国産業復興法）"], answer: 0, explain: "ローズヴェルト大統領のもと、公共事業による失業者の救済を図った" },
  { label: "【世界史・現代】", q: "1929年にムッソリーニ政権がローマ教皇庁と結び、ヴァチカン市国の独立を承認した条約は？", choices: ["ラテラン条約", "ミュンヘン協定", "ロカルノ条約"], answer: 0, explain: "政教和解によって、ファシズム体制の安定を図った" },
  { label: "【世界史・現代】", q: "1938年のミュンヘン会談で、ドイツへの割譲が認められた地域は？", choices: ["ダンツィヒ", "ラインラント", "ズデーテン地方"], answer: 2, explain: "イギリスとフランスは、ドイツに対して宥和政策をとった" },
  { label: "【世界史・現代】", q: "1943年2月にドイツ軍が降伏し、独ソ戦の転換点となった戦いは？", choices: ["エル＝アラメインの戦い", "スターリングラードの戦い", "ミッドウェー海戦"], answer: 1, explain: "ミッドウェー海戦は太平洋戦争、エル＝アラメインは北アフリカの戦い" },
  { label: "【世界史・現代】", q: "1945年2月のヤルタ会談の秘密協定で、ドイツ降伏後に行うことが決まったソ連の行動は？", choices: ["対日参戦", "東欧からの撤兵", "国際連合への加盟拒否"], answer: 0, explain: "アメリカ・イギリス・ソ連の首脳が、ドイツの戦後処理も協議した" },
  { label: "【世界史・現代】", q: "1947年のトルーマン＝ドクトリンで、アメリカが援助を表明した国は？", choices: ["イタリアとスペイン", "ポーランドとチェコスロヴァキア", "ギリシアとトルコ"], answer: 2, explain: "ソ連の影響拡大を封じ込める「冷戦」の始まりとされる" },
  { label: "【世界史・現代】", q: "1949年に西側諸国が結成した軍事同盟は？", choices: ["ワルシャワ条約機構", "東南アジア条約機構（SEATO）", "北大西洋条約機構（NATO）"], answer: 2, explain: "ワルシャワ条約機構は、1955年に東側諸国が結成した" },
  { label: "【世界史・現代】", q: "朝鮮戦争の休戦協定が1953年に調印された場所は？", choices: ["平壌", "板門店", "仁川"], answer: 1, explain: "北緯38度線付近にあたる" },
  { label: "【世界史・現代】", q: "1954年のジュネーヴ休戦協定で、ベトナムの暫定軍事境界線とされたのは？", choices: ["北緯38度線", "北緯49度線", "北緯17度線"], answer: 2, explain: "インドシナ戦争が終結し、フランスはインドシナから撤退した" },
  { label: "【世界史・現代】", q: "1955年に平和十原則を採択した、アジア・アフリカ会議（バンドン会議）が開かれた国は？", choices: ["インド", "インドネシア", "エジプト"], answer: 1, explain: "周恩来・ネルー・ナセルらが参加し、第三世界の連帯を示した" },
  { label: "【世界史・現代】", q: "1962年のキューバ危機のときの、ソ連の最高指導者は？", choices: ["スターリン", "ブレジネフ", "フルシチョフ"], answer: 2, explain: "米ソの間にホットラインが設けられるきっかけとなった" },
  { label: "【世界史・現代】", q: "1989年12月に、ブッシュ（父）とゴルバチョフが冷戦の終結を宣言した会談は？", choices: ["マルタ会談", "ヤルタ会談", "ポツダム会談"], answer: 0, explain: "同年11月にはベルリンの壁が開放された" }
];

// ========== ゲーム本体 ==========
const STORAGE_KEY = "swipeVocabRPG.v1";
const BOSSES_PER_DAY = 3;       // 1日に倒せるボスの数（やりすぎ防止）
const BOSS_MAX_HP = 100;
const DAMAGE = 10;              // 正解1回のダメージ
const HEAL_ON_WRONG = 5;        // 不正解でボスが回復する量
const BASE_XP = 10;

const MONSTERS = [
  { emoji: "👾", name: "スライム語" },
  { emoji: "🐲", name: "ドラゴン文法" },
  { emoji: "👹", name: "オニ熟語" },
  { emoji: "🦑", name: "クラーケン構文" },
  { emoji: "🧟", name: "ゾンビ発音" },
  { emoji: "🦖", name: "ティラノ長文" }
];

const $ = (id) => document.getElementById(id);
const feed = $("feed");

// ---------- 保存データ ----------
function todayStr() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（端末のローカル日付）
}
function load() {
  const base = { level: 1, xp: 0, totalDefeated: 0, bestCombo: 0, date: todayStr(), bossesToday: 0, genre: "すべて" };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const s = Object.assign(base, saved);
    if (s.date !== todayStr()) { s.date = todayStr(); s.bossesToday = 0; }
    return s;
  } catch (e) {
    return base;
  }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 保存できなくても遊べる */ }
}

let state = load();
let boss = { hp: BOSS_MAX_HP, monster: MONSTERS[0] };
let combo = 0;
let queue = [];

// ---------- ユーティリティ ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- ジャンル ----------
// ラベル「【日本史・古代】」の「日本史」の部分をジャンルとして自動で使う。ラベルがなければ「その他」。
const ALL = "すべて";
function genreOf(q) {
  const m = (q.label || "").match(/【(.+?)(?:・.*)?】/);
  return m ? m[1] : "その他";
}
const GENRES = [ALL].concat(Array.from(new Set(QUESTIONS.map(genreOf))));
if (!GENRES.includes(state.genre)) state.genre = ALL;
function pool() {
  return state.genre === ALL ? QUESTIONS : QUESTIONS.filter((q) => genreOf(q) === state.genre);
}
function nextQuestion() {
  if (queue.length === 0) queue = shuffle(pool());
  return queue.pop();
}
function xpNeeded() { return state.level * 50; }

// ---------- 効果音・演出 ----------
let audioCtx = null;
function beep(freqs, dur = 0.12) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t = audioCtx.currentTime + i * dur;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + dur);
    });
  } catch (e) { /* 音が鳴らなくても問題なし */ }
}
function confetti(n = 36) {
  const fx = $("fx");
  const colors = ["#ffcf3f", "#3ddc84", "#6ea8ff", "#ff5470", "#b78bff"];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "%";
    c.style.background = colors[i % colors.length];
    c.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
    c.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    c.style.animationDelay = Math.random() * 0.25 + "s";
    fx.appendChild(c);
    setTimeout(() => c.remove(), 1900);
  }
}
function flash() {
  const f = document.createElement("div");
  f.className = "flash";
  $("fx").appendChild(f);
  setTimeout(() => f.remove(), 400);
}
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}
function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// ---------- HUD ----------
function updateHud() {
  $("level").textContent = "Lv." + state.level;
  $("xpFill").style.width = Math.min(100, (state.xp / xpNeeded()) * 100) + "%";
  $("hpFill").style.width = (boss.hp / BOSS_MAX_HP) * 100 + "%";
  $("enemyEmoji").textContent = boss.monster.emoji;
  $("enemyName").textContent = boss.monster.name;
  $("combo").textContent = "COMBO " + combo;
  $("today").textContent = `今日 ${state.bossesToday}/${BOSSES_PER_DAY}体`;
  $("genreBtn").textContent = "📚 " + state.genre;
}
function gainXp(amount) {
  state.xp += amount;
  while (state.xp >= xpNeeded()) {
    state.xp -= xpNeeded();
    state.level++;
    toast(`🎉 レベルアップ！ Lv.${state.level}`);
    confetti(60);
    beep([523, 659, 784, 1047], 0.14);
  }
}

// ---------- スクロール制御 ----------
// いつでもスワイプできる。次のカードは先に用意しておく。
let bossActive = true;
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting || e.intersectionRatio <= 0.6) return;
    const card = e.target;
    if (card.dataset.kind !== "q") return;
    // 前の問題を答えずにスワイプしたら「スキップ」扱い（コンボだけ途切れる）
    const prev = card.previousElementSibling;
    if (prev && prev.dataset.kind === "q" && !prev.dataset.answered && !prev.dataset.skipped) {
      prev.dataset.skipped = "1";
      combo = 0;
      updateHud();
    }
    ensureNext(card);
  });
}, { root: feed, threshold: [0.6] });

function ensureNext(card) {
  if (bossActive && !card.nextElementSibling) addQuestionCard();
}
function goNext(card) {
  const next = card.nextElementSibling;
  if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- カード生成 ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function addQuestionCard() {
  const q = nextQuestion();
  const card = el("section", "card");
  card.dataset.kind = "q";

  card.appendChild(el("div", "q-label", q.label || "この単語の意味は？"));
  const qt = el("div", "q-text", q.q);
  if (q.q.length > 12) qt.classList.add("small"); // 長い問題文は小さめに
  if (q.q.length > 36) qt.classList.add("xsmall");
  card.appendChild(qt);

  const choices = el("div", "choices");
  const order = shuffle(q.choices.map((text, i) => ({ text, i })));
  const result = el("div", "result");

  order.forEach((c) => {
    const b = el("button", "choice", c.text);
    b.type = "button";
    b.addEventListener("click", () => onAnswer(card, q, order, choices, result, b, c.i));
    choices.appendChild(b);
  });
  card.appendChild(choices);
  card.appendChild(result);

  feed.appendChild(card);
  observer.observe(card);
  return card;
}

function onAnswer(card, q, order, choices, result, btn, picked) {
  if (card.dataset.answered === "1") return;
  card.dataset.answered = "1";

  const ok = picked === q.answer;
  const buttons = Array.from(choices.children);
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (order[idx].i === q.answer) b.classList.add("correct");
  });
  if (!ok) btn.classList.add("wrong");

  result.textContent = "";
  const verdict = el("div", "verdict " + (ok ? "ok" : "ng"), ok ? "⭕ 正解！" : "❌ 残念…");
  result.appendChild(verdict);
  result.appendChild(el("div", "explain", q.explain));

  if (ok) {
    combo++;
    state.bestCombo = Math.max(state.bestCombo, combo);
    boss.hp = Math.max(0, boss.hp - DAMAGE);
    gainXp(BASE_XP + Math.min(combo - 1, 5) * 2);
    beep([660, 880]);
    retrigger($("enemyEmoji"), "hit");
    retrigger($("combo"), "pop");
    confetti(combo >= 3 ? 40 : 12);
    if (combo >= 3) flash();
  } else {
    combo = 0;
    boss.hp = Math.min(BOSS_MAX_HP, boss.hp + HEAL_ON_WRONG);
    beep([220, 180], 0.15);
  }
  updateHud();
  save();

  if (boss.hp === 0) {
    bossDefeated(card, result);
  } else {
    result.appendChild(el("div", "hint", "⬆ 上にスワイプして次へ"));
    ensureNext(card);
  }
}

function bossDefeated(card, result) {
  state.totalDefeated++;
  state.bossesToday++;
  save();
  updateHud();
  confetti(100);
  flash();
  beep([523, 659, 784, 1047, 1319], 0.12);

  const finished = state.bossesToday >= BOSSES_PER_DAY;
  const clear = el("section", "card center");
  clear.dataset.kind = "info";
  clear.appendChild(el("div", "big-emoji", "🏆"));
  clear.appendChild(el("div", "q-text", `${boss.monster.name} を撃破！`));
  clear.appendChild(el("div", "explain", `最高コンボ ${state.bestCombo} ／ 通算 ${state.totalDefeated} 体`));

  if (finished) {
    clear.appendChild(el("div", "explain", "今日の探索はここまで。おつかれさま！また明日 🌙"));
  } else {
    const b = el("button", "btn", "次のボスへ ▶");
    b.type = "button";
    b.addEventListener("click", startBoss);
    clear.appendChild(b);
  }
  bossActive = false;
  while (card.nextElementSibling) card.nextElementSibling.remove();
  feed.appendChild(clear);
  result.appendChild(el("div", "hint", "⬆ 上にスワイプ"));
  clear.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showDoneCard() {
  const done = el("section", "card center");
  done.dataset.kind = "info";
  done.appendChild(el("div", "big-emoji", "🌙"));
  done.appendChild(el("div", "q-text", "今日の探索は終了！"));
  done.appendChild(el("div", "explain", `今日は ${BOSSES_PER_DAY} 体倒しました。また明日挑戦しよう。`));
  bossActive = false;
  feed.appendChild(done);
}

function startBoss() {
  boss = {
    hp: BOSS_MAX_HP,
    monster: MONSTERS[state.totalDefeated % MONSTERS.length]
  };
  combo = 0;
  bossActive = true;
  updateHud();
  const card = addQuestionCard();
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- ジャンル切り替え ----------
function renderGenreSheet() {
  const list = $("genreList");
  list.textContent = "";
  GENRES.forEach((g) => {
    const n = g === ALL ? QUESTIONS.length : QUESTIONS.filter((q) => genreOf(q) === g).length;
    const b = el("button", "genre-item" + (g === state.genre ? " active" : ""), `${g}（${n}問）`);
    b.type = "button";
    b.addEventListener("click", () => selectGenre(g));
    list.appendChild(b);
  });
}
function openGenreSheet() { renderGenreSheet(); $("genreSheet").hidden = false; }
function closeGenreSheet() { $("genreSheet").hidden = true; }

function rebuildFeed() {
  observer.disconnect();
  feed.textContent = "";
  feed.scrollTop = 0;
  if (state.bossesToday >= BOSSES_PER_DAY) {
    showDoneCard();
    return;
  }
  if (boss.hp <= 0) { // ボス撃破画面で切り替えた場合は、新しいボスから始める
    boss = { hp: BOSS_MAX_HP, monster: MONSTERS[state.totalDefeated % MONSTERS.length] };
    combo = 0;
  }
  bossActive = true;
  updateHud();
  addQuestionCard();
}
function selectGenre(g) {
  closeGenreSheet();
  if (g === state.genre) return;
  state.genre = g;
  save();
  queue = [];
  rebuildFeed();
  toast("📚 " + g + " に切り替えました");
}
$("genreBtn").addEventListener("click", openGenreSheet);
$("genreClose").addEventListener("click", closeGenreSheet);
$("genreBackdrop").addEventListener("click", closeGenreSheet);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGenreSheet(); });

// ---------- キーボード操作（PC用） ----------
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  feed.scrollBy({ top: (e.key === "ArrowDown" ? 1 : -1) * feed.clientHeight, behavior: "smooth" });
});

// ---------- 起動 ----------
function init() {
  boss.monster = MONSTERS[state.totalDefeated % MONSTERS.length];
  updateHud();
  if (state.bossesToday >= BOSSES_PER_DAY) {
    showDoneCard();
  } else {
    addQuestionCard();
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
init();
