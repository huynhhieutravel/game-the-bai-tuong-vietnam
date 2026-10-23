# Bảng Thuật Ngữ Chuẩn Hóa (GLOSSARY) — Việt Sát Engine

Tài liệu này định nghĩa hệ thống ngôn ngữ và khái niệm thống nhất (Ubiquitous Language) cho toàn bộ logic game Việt Sát, ngăn ngừa việc dùng lẫn lộn hoặc sai lệch thuật ngữ giữa Engine, AI, UI và Tài liệu thiết kế (GDD).

---

## 1. Vòng Đời Lượt Chơi (Turn Lifecycle)

- **Turn (Lượt chơi):** Toàn bộ chu kỳ hành động của một người chơi, gồm đủ 6 pha tuần tự không được phép nhảy cóc.
- **Begin Phase (Pha Bắt đầu):** Pha đầu tiên của lượt, chỉ kích hoạt các kỹ năng có điều kiện "đầu lượt" (ví dụ: rút thêm bài, đổi bài).
- **Judge Phase (Pha Phán xét):** Pha xử lý các lá cẩm nang trì hoãn (Hỗn Loạn, Sấm Sét). Áp dụng quy tắc LIFO (Last-In-First-Out — lá đặt vào sau xử lý trước).
- **Draw Phase (Pha Rút bài):** Người chơi rút bài mặc định (thường là 2 lá từ chồng bài rút `drawPile`).
- **Action Phase (Pha Ra bài / Hành động):** Pha chủ động của người chơi. Tuân thủ quy tắc vàng: Tối đa 1 lá **Chém** mỗi lượt (trừ khi có trang bị/kỹ năng phá vỡ giới hạn).
- **Discard Phase (Pha Bỏ bài):** Người chơi phải bỏ số bài trên tay vượt quá lượng HP hiện tại xuống `discardPile`.
- **End Phase (Pha Kết thúc):** Pha dọn dẹp và kích hoạt các kỹ năng "cuối lượt".

---

## 2. Hệ Thống Sự Kiện & Phản Hồi (Event & Reaction)

- **Headless Engine:** Lõi xử lý logic game hoàn toàn thuần JavaScript/TypeScript, độc lập với React DOM/UI, có tính đơn định (deterministic) để phục vụ test và chuyển giao lên Server Authoritative.
- **Reaction Stack (Ngăn xếp phản ứng):** Cấu trúc ngăn xếp quản lý các yêu cầu phản hồi (hỏi Né khi bị Chém, hỏi Đào khi Hấp hối, chuỗi Hóa Giải cẩm nang). Giải quyết triệt để tình trạng kẹt game do cờ `waitingForResponse` bị ghi đè.
- **Priority Window (Cửa sổ ưu tiên):** Thứ tự quyền phản hồi được luân chuyển tuần tự theo chiều kim đồng hồ quanh bàn chơi, bắt đầu từ người kích hoạt hoặc mục tiêu trực tiếp.
- **Dying State (Trạng thái Hấp hối):** Khi một người chơi có $HP \le 0$. Game tạm dừng mọi hành động khác để mở cửa sổ ưu tiên cứu viện (cần Đào/Rượu) cho đến khi $HP = 1$ hoặc người chơi chính thức **Tử trận (Death)**.

---

## 3. Thẻ Bài & Tướng (Cards & Heroes)

- **Card Descriptor:** Cấu trúc định nghĩa một lá bài gồm: `id`, `name`, `type` (cơ bản, cẩm nang, trang bị), `suit` (Bích, Cơ, Nhép, Rô), `rank` (A-K), và hiệu ứng.
- **Hero Module:** Mô-đun đóng gói riêng biệt cho từng vị tướng, gồm thông số (`name`, `faction`, `maxHp`, `gender`) và danh sách các Skill Descriptor độc lập, có Unit Test đi kèm 1:1.
- **Skill Descriptor:** Định nghĩa chuẩn cho một kỹ năng, bao gồm:
  - `trigger`: Thời điểm kích hoạt (chủ động trong Action Phase hoặc bị động qua Hook).
  - `canUse`: Hàm kiểm tra điều kiện kích hoạt.
  - `cost`: Chi phí bài/máu phải trả.
  - `resolve`: Logic thực thi hiệu ứng.
  - `aiHints`: Chỉ dẫn hành vi cho Bot AI.
- **Range & Distance (Tầm đánh & Khoảng cách):**
  - **Distance (Khoảng cách):** Số bước ngắn nhất giữa 2 người chơi trên vòng tròn, chịu ảnh hưởng bởi Ngựa +1 và Ngựa -1.
  - **Attack Range (Tầm đánh):** Tầm với tối đa của vũ khí người chơi đang trang bị (mặc định = 1). Người chơi chỉ được Chém mục tiêu có $\text{Khoảng cách} \le \text{Tầm đánh}$.

---

## 4. Hệ Thống Kiểm Định & Bất Biến (QA & Invariants)

- **Game Invariant (Bất biến trò chơi):** Các quy tắc cốt lõi bất khả xâm phạm mà bất kỳ hành động hoặc kỹ năng nào cũng không được vi phạm (ví dụ: tối đa 1 Chém/lượt trừ khi có vũ khí đặc thù; người chơi có $HP \le 0$ bắt buộc phải đi qua trạng thái Hấp hối trước khi chết; bài trên tay cuối lượt không vượt quá HP).
- **Skill Trigger Filter (Bộ lọc kích hoạt):** Cơ chế định danh người kích hoạt kỹ năng, bắt buộc kiểm tra `ownerId === context.actorId` để ngăn chặn triệt để lỗi "nhảy ké" (tướng không liên quan tự động kích hoạt kỹ năng của người khác).
- **Universal AI Fallback (Bộ ngắt an toàn AI):** Cơ chế tự động phản hồi lệnh Bỏ qua/Hủy (`cancel: true`) khi Bot gặp một yêu cầu lạ hoặc chưa được lập trình riêng, ngăn ngừa hoàn toàn tình trạng game bị treo (deadlock).
- **Headless Simulation (Giả lập không đầu):** Quá trình chạy hàng ngàn trận đấu tự động giữa các Bot với tốc độ cao không cần giao diện người dùng (UI), sử dụng random seed cố định để kiểm tra lỗi kẹt vòng lặp (infinite loop), lỗi rò rỉ bộ nhớ hoặc crash logic.

---

## 5. Cơ Chế Cặp Tướng & Quốc Chiến (Dual Heroes & National War)

- **Dual Heroes (Cặp Tướng):** Mỗi người chơi trong chế độ Quốc Chiến sở hữu 2 vị tướng cùng một phe: **Chính Tướng (`mainHeroId`)** và **Phó Tướng (`subHeroId`)**. Mọi trạng thái game bắt buộc phải bảo toàn đồng thời cả 2 ID này xuyên suốt toàn bộ vòng đời ván đấu.
- **Combined Health Rule (Máu Kết Hợp):** Lượng máu tối đa của người chơi được tính toán tự động bằng công thức trung bình cộng làm tròn xuống: $\text{MaxHP} = \lfloor(\text{MaxHP}_1 + \text{MaxHP}_2) / 2\rfloor$.
- **Hero Reveal State (Trạng thái Lộ diện):** Mảng cờ nhị phân `revealedHeroes = [bool, bool]` theo dõi độc lập trạng thái ẩn/hiện của từng tướng:
  - Khi chưa lật (`false`): Đối thủ chỉ nhìn thấy Tướng Ẩn (`🕵️`), danh tính và phe phái được giữ bí mật.
  - Khi đã lật (`true`): Chân dung, danh tính, phe phái và toàn bộ kỹ năng của vị tướng đó hiển lộ công khai với toàn bàn đấu.
- **Skill Dormancy while Hidden (Kỹ năng ngủ đông):** Toàn bộ kỹ năng (chủ động, bị động, khóa) của một vị tướng đang ẩn sẽ ở trạng thái ngủ đông, không được phép can thiệp vào bàn đấu trừ khi được kích hoạt kèm theo hành động lật tướng.
- **Auto-Reveal on Trigger (Tự động lật khi phát động):** Khi một kỹ năng bị động hoặc phản ứng của tướng đang ẩn thỏa mãn điều kiện và người chơi lựa chọn kích hoạt, tướng tương ứng sẽ được tự động lật mặt (`revealedHeroes[index] = true`) để thực thi hiệu ứng.

---

## 6. Quản Lý Vùng Thẻ & Chuyển Bài Nguyên Tử (Card Zones & Atomic Transfer)

- **Card Zone (Vùng thẻ):** Không gian độc quyền chứa thẻ bài trong suốt ván chơi, gồm 6 vùng chuẩn:
  1. `drawPile` (Chồng bài rút)
  2. `discardPile` (Chồng bài bỏ)
  3. `hand` (Bài trên tay của người chơi)
  4. `equipment` (Ô trang bị: vũ khí, phòng cụ, ngựa công, ngựa thủ)
  5. `judgementArea` (Khu vực phán xét chứa cẩm nang trì hoãn: Sấm Sét, Hỗn Loạn)
  6. `exile/limbo` (Vùng bài đang được xử lý tạm thời trước khi phân giải)
- **Card Conservation Invariant (Bất biến bảo toàn bài):** Tổng số lá bài trong toàn bộ hệ thống luôn là một hằng số bất biến (ví dụ: đúng 106 lá trong bộ bài chuẩn). Không một lá bài nào được phép tự ý sinh ra (duplication) hoặc biến mất (leak) ngoài tầm kiểm soát của Engine.
- **Atomic Card Transfer (Chuyển Bài Nguyên Tử):** Thao tác di chuyển bài giữa các vùng là một hành động nguyên tử duy nhất. Khi một lá bài được trang bị từ tay, nó được bốc khỏi `hand` và gán vào `equipment[slot]`; tuyệt đối không được phép vừa đưa vào `equipment` vừa ném vào `discardPile`. Chỉ có trang bị cũ bị đè lên mới chuyển xuống `discardPile`.
- **Equipment Slot Normalization (Chuẩn Hóa Ô Trang Bị):** Ánh xạ chuẩn tắc giữa phân loại bài `CARD_SUBTYPES` (`equip_weapon`, `equip_armor`, `equip_mount_atk`, `equip_mount_def`) và 4 vị trí trên thanh trạng thái của người chơi (`weapon`, `armor`, `horse_attack`, `horse_defense`).

---

## 7. Cơ Chế Phán Xét, Giới Hạn Combo & Bỏ Bài Sinh Tồn (Judgement, Safe Cap & Discard)

- **Judgement Negate Window (Cửa Sổ Hóa Giải Phán Xét):** Khoảng thời gian ưu tiên mở ra vào đầu Pha Phán xét, trước khi lật lá bài phán xét từ đầu chồng bài rút. Toàn bộ người chơi trên bàn theo chiều kim đồng hồ có quyền sử dụng lá bài [Hóa Giải] để hủy bỏ cẩm nang trì hoãn (`Sấm Sét`, `Hỗn Loạn`) và đưa nó thẳng xuống `discardPile`.
- **Safe Turn Cap (Giới Hạn Kích Hoạt An Toàn):** Hạn mức kích hoạt tối đa cho mỗi kỹ năng trong một lượt chơi (mặc định = 5 lần/lượt). Ngăn ngừa triệt để các vòng lặp kích hoạt kỹ năng bị động vô hạn khi kết hợp các cặp tướng có kỹ năng cộng hưởng liên hoàn (ví dụ: Tiên Dung + Chử Đồng Tử).
- **Survival-Priority Discard (Bỏ Bài Ưu Tiên Sinh Tồn):** Quy chuẩn xếp hạng ưu tiên giữ lại các thẻ bài quan trọng khi người chơi phải bỏ bớt bài trên tay ở Pha Bỏ bài. Áp dụng cho cả thuật toán Bot AI và tính năng tự động bỏ bài khi người chơi hết thời gian đếm ngược:
  1. $\text{Ưu tiên 1 (Tuyệt đối giữ)}:$ **Đào** (100đ), **Rượu** (90đ).
  2. $\text{Ưu tiên 2 (Phòng thủ)}:$ **Né** (80đ), **Hóa Giải** (75đ).
  3. $\text{Ưu tiên 3 (Chiến lược)}:$ **Trang bị chưa lắp** (50đ).
  4. $\text{Ưu tiên 4 (Loại bỏ trước)}:$ **Chém** (30đ), **Cẩm nang khác** (20đ).

---

## 8. Thắng Cuộc Đồng Đội & Trí Tuệ Trung Thành Phe Phái (Team Victory & Faction Loyalty)

- **Team Victory (Đại Thắng Đồng Đội):** Điều kiện kết thúc ván đấu khi toàn bộ người chơi còn sống sót trên bàn đều thuộc về cùng một Phe. Toàn bộ người chơi cùng phe đó đều được tính là người chiến thắng chung cuộc.
- **Force Reveal on Endgame (Cưỡng Chế Lật Tướng Cuối Trận):** Cơ chế tự động lật mở công khai toàn bộ các vị tướng (`revealedHeroes = [true, true]`) của những người chơi còn sống sót khi điều kiện chiến thắng được kích hoạt, phục vụ việc công bố kết quả minh bạch trên UI.
- **Faction Loyalty (Lòng Trung Thành Phe Phái):** Quy tắc xử lý nhận diện đồng minh của Bot AI. Bot tuyệt đối không dùng [Chém], [Quyết Đấu], [Cướp Bài], [Tước Bài] lên đồng minh cùng phe đã lộ diện, và chỉ dùng [Đào] hoặc [Hóa Giải] để cứu viện bản thân hoặc đồng minh cùng phe.

---

## 9. Cân Bằng Dã Tâm & Kỹ Thuật Bị Động Trang Bị (Careerist & Equipment Passives)

- **🐺 Careerist (Dã Tâm):** Cơ chế cân bằng số lượng phe phái trong Quốc Chiến. Khi một người chơi lật tướng, nếu số người chơi cùng phe này đã lộ diện vượt quá $\lfloor N / 2 \rfloor$ ($N$ là tổng số người chơi ban đầu), người đó ngay lập tức bị thoái hóa thành Dã Tâm (`isDaTam = true`). Dã Tâm bị xem là một thế lực độc lập, không còn đồng minh, không thể chia sẻ chiến thắng đồng đội (Team Victory) và chỉ chiến thắng khi là người sống sót duy nhất trên bàn.
- **☯️ Bát Quái / Thần Giáp Judgement (Phán Xét Bát Quái):** Phản ứng phòng thủ đặc biệt khi bị Chém. Người chơi sở hữu trang bị [Bát Quái] hoặc kỹ năng [Thần Giáp] (Rùa Vàng, khi không có giáp) được quyền lật 1 lá phán xét từ đầu bộ bài: Nếu là màu Đỏ (Cơ/Rô), tự động tính như đã đánh ra 1 lá [Né]; nếu là màu Đen, phán xét thất bại và người chơi vẫn có quyền tiếp tục đánh lá [Né] từ trên tay.
- **💨 Quạt Sắt (Iron Fan / Quạt Ba Tiêu):** Khi bạn dùng [Chém] trúng một mục tiêu đang không có bất kỳ lá bài nào trên tay, sát thương gây ra được tăng thêm +1 (gây 2 HP sát thương).
- **🦁 Bạch Ngân (Silver Lion / Bạch Ngân Sư Tử):** Khi trang bị giáp này, mọi sát thương dồn nhận vào từ một nguồn (như nổ Sấm Sét 3 HP, hoặc Rượu + Chém 2 HP) đều bị giới hạn tối đa là 1 HP. Khi giáp Bạch Ngân rời khỏi người chơi (bị tháo ra, thay bằng giáp mới, hoặc bị Cướp/Tước), người chơi lập tức được hồi phục 1 HP.
- **🪓 Rìu Đá (Rock Axe / Quán Thạch Phủ):** Khi cú [Chém] của bạn bị mục tiêu dùng [Né] tránh được, bạn có thể tự nguyện bỏ đi 2 lá bài bất kỳ trên tay hoặc trang bị để bắt buộc nhát Chém đó trúng đích (xuyên phá cú Né).
- **🐉 Thanh Long Đao (Green Dragon Crescent Blade):** Khi cú [Chém] của bạn bị mục tiêu dùng [Né] tránh được, nếu trên tay bạn vẫn còn bài [Chém], bạn có quyền lập tiếp nhát [Chém] thứ hai lên cùng mục tiêu đó.

## 10. Xiềng Xích, Sát Thương Nguyên Tố Liên Hoàn & Cẩm Nang Trì Hoãn (Chained & Delayed Tricks)

- **⛓️ Iron Chains & Reforge (Xiềng Xích & Rèn Lại):**
  - **Khóa / Tháo Xích:** Chọn 1 đến 2 người chơi để đảo ngược trạng thái xích (`isChained = !isChained`). Có thể bị [Hóa Giải] vô hiệu hóa.
  - **Rèn Lại (`Reforge`):** Không chọn mục tiêu hoặc chọn lệnh Rèn Lại, người chơi đưa lá Xiềng Xích vào chồng bài bỏ và lập tức rút 1 lá bài mới từ chồng bài rút. Hành động này **không thể bị Hóa Giải**.
- **⚡ Chained Elemental Damage (Sát Thương Lôi Hỏa Liên Hoàn):** Khi một người chơi đang bị khóa xích (`isChained === true`) phải chịu sát thương nguyên tố (Lôi / Hỏa từ Sấm Sét, Chém Lửa, Chém Sét), dây xích của người đó lập tức được cởi bỏ (`isChained = false`), và toàn bộ lượng sát thương cùng thuộc tính nguyên tố đó sẽ tự động lan truyền ngay lập tức sang tất cả những người chơi khác đang bị khóa xích trên bàn cờ. Dây xích của những người nhận sát thương lan truyền cũng đồng thời được cởi bỏ.
- **⏳ Delayed Tricks (Cẩm Nang Trì Hoãn):**
  - Lá bài được đặt thẳng từ trên tay vào khu phán xét (`judgementArea`) của mục tiêu mà không qua chồng bài bỏ (bảo toàn invariant số lượng thẻ bài).
  - Phán xét theo cơ chế LIFO (lá đặt vào sau cùng được phán xét trước tiên) trong Giai đoạn Phán Xét (`JUDGE` Phase).
  - **🌩️ Sấm Sét:** Phán xét ra Bích (♠) từ 2 đến 9 thì phát nổ gây 3 sát thương Lôi (kích hoạt liên hoàn xích) và vào chồng bài bỏ; ngược lại nếu không nổ, lá bài chuyển sang khu phán xét của người chơi còn sống kế tiếp.
  - **🌀 Hỗn Loạn (Binh Lương Thốn Đoạn):** Phán xét KHÔNG PHẢI Cơ (♥) thì người chơi bị mất hoàn toàn Giai đoạn Ra Bài (`ACTION` Phase) của lượt đó; phán xét ra Cơ thì người chơi thoát khỏi bẫy và tiến vào lượt bình thường.

## 11. Mượn Đao Giết Người, Cướp/Tước Đa Vùng & Khắc Chế Trang Bị (Borrow Sword & Tactical Expansion)

- **🗡️ Mượn Đao Giết Người (Borrow Sword):** Cẩm nang đơn mục tiêu buộc Người chơi A (đang trang bị vũ khí) phải đánh 1 lá [Chém] lên Người chơi B (nằm trong tầm đánh của A). Nếu A không đánh Chém (hoặc không có Chém), A buộc phải giao nộp lá bài Vũ khí đang trang bị của mình cho người dùng Mượn Đao.
- **🤏 Cướp Bài & 💥 Tước Bài Đa Vùng (Multi-Zone Steal & Dismantle):**
  - Không chỉ giới hạn trên bài trên tay, người chơi có thể chỉ định hoặc tự động chọn lấy/loại bỏ thẻ bài từ 3 vùng khác nhau của mục tiêu: **Bài trên tay (Hand)**, **Bài trang bị (Equipment: Vũ khí, Giáp, Ngựa)**, hoặc **Bài trong khu phán xét (Judgement Area: Hỗn Loạn, Sấm Sét)**.
  - Cho phép người chơi dùng Cướp/Tước để giải cứu đồng minh khỏi cẩm nang trì hoãn nguy hiểm.
- **🛡️ Hắc Thuẫn (Black Shield / Nhân Vương Thuẫn):** Giáp phòng thủ đặc biệt giúp người sở hữu miễn nhiễm tuyệt đối với mọi lá [Chém] có màu Đen (chất Bích ♠ và Nhép ♣). Cú Chém đen sẽ lập tức bị hủy bỏ và không kích hoạt khung hỏi [Né].
- **🍶 Giới Hạn [Rượu] Hấp Hối (Wine Self-Rescue Invariant):** Người chơi khi rơi vào trạng thái Hấp hối (`hp <= 0`) được quyền tự dùng lá [Rượu] trên tay như 1 lá [Đào] để hồi 1 HP cho chính mình. Tuy nhiên, tuyệt đối **không** được dùng [Rượu] để cứu người chơi khác (chỉ được cứu người khác bằng lá [Đào]).

---

## 12. Vòng Đời Phản Ứng Kỹ Năng Tướng & Vũ Khí Đặc Thù (Hero Triggers Lifecycle & Special Weapons)

- **🔄 Hero Reactive Triggers Lifecycle (Chu Kỳ Sự Kiện Kỹ Năng Tướng):**
  Hệ thống kích hoạt sự kiện tự động theo vòng đời của ván đấu giữa `StateMachine`, `CombatRules`, `TrickRules` và `HeroRegistry`:
  - `BEGIN_PHASE`: Đầu lượt (Lang Liêu - Bánh Chưng sắp xếp bài đầu chồng rút, Nguyên Phi Ỷ Lan - Phật Tâm).
  - `DRAW_PHASE`: Giai đoạn rút bài (Phùng Hưng - Khởi Nghĩa rút 1 bài nhận +1 sát thương, Triệu Quang Phục - Dạ Trạch cướp bài thay rút, Đô Đốc Bảo - Phá Thành phán xét).
  - `DISCARD_PHASE`: Giai đoạn bỏ bài (Nhiếp Chính Tô Hiến Thành miễn bỏ bài nếu lượt này chưa dùng Chém).
  - `END_PHASE`: Cuối lượt (Trần Quang Khải - Đoạt Sáo rút 4 bài bỏ 1 bài, Huyền Trân Công Chúa - An Bang rút 1 bài cuối lượt).
  - `ON_SLASH_TARGET`: Khi Chém chỉ định mục tiêu (Cao Lỗ - Nỏ Thần cấm Né và tăng sát thương, Thánh Gióng - Tre Ngà phán xét bắt bỏ bài cùng chất, Nguyễn Xí - Phá Quân bắt dùng 2 Né).
  - `ON_DODGE_SUCCESS`: Khi Né thành công (Đinh Điền - Phạt Tội trừ 1 HP kẻ tấn công).
  - `ON_DAMAGED`: Khi nhận sát thương (Lý Thường Kiệt - Nam Quốc Sơn Hà rút bài và thu hồi bài, Khúc Thừa Dụ - Khoan Dân, Đinh Bộ Lĩnh - Uy Chấn, Chu Văn An - Thất Trảm Sớ).
  - `ON_DYING`: Khi rơi vào hấp hối (Chử Đồng Tử - Hóa Tiên hồi 3 HP và 3 bài, Nguyễn Địa Lô - Hộ Chủ lật bài Trung hồi 1 HP).
  - `ON_TRICK_PLAYED`: Khi dùng cẩm nang thường (Tiên Dung - Duyên Tiên rút 1 bài).
  - `ON_EQUIP_LOST`: Khi trang bị bị tháo bỏ, cướp, tước hoặc thay thế (Hồ Xuân Hương - Xuân Hương rút 2 bài).
  - `ON_JUDGED`: Khi lá bài phán xét có hiệu lực (Ngọc Hân Công Chúa - Thông Ngôn thu hồi lá phán xét).
- **⚔️ Song Kiếm (Twin Swords / Song Cổ Kiếm):** Vũ khí công kích cự ly 2. Khi bạn dùng [Chém] tấn công một mục tiêu khác giới tính (Nam chém Nữ, Nữ chém Nam), mục tiêu bị ép phải tự bỏ đi 1 lá bài trên tay hoặc trang bị; nếu mục tiêu không còn bài để bỏ, bạn được rút 1 lá bài từ chồng bài rút.
- **🔱 Phương Thiên Kích (Sky Halberd / Phương Thiên Họa Kích):** Vũ khí uy lực cự ly 4. Khi lá [Chém] mà bạn sử dụng là **lá bài cuối cùng trên tay**, bạn có thể chỉ định cùng lúc tối đa 3 người chơi khác nhau trong tầm công kích làm mục tiêu của nhát Chém này.
- **🔥 Hỏa Công (Fire Attack):** Cẩm nang gây sát thương nguyên tố Lửa. Người dùng chỉ định 1 mục tiêu đang có bài trên tay. Mục tiêu để lộ 1 lá bài trên tay cho tất cả cùng thấy. Người dùng nếu bỏ ra 1 lá bài trên tay có cùng chất (suit) với lá bài vừa lộ diện thì mục tiêu phải chịu 1 điểm sát thương Lửa (`fire damage`). Nếu mục tiêu đang bị Xiềng Xích, sát thương Lửa sẽ tháo xích và lan truyền sang tất cả người chơi bị xích còn lại.

---

## 13. Chuẩn Hóa Ánh Xạ Modal Phản Hồi & Vòng Đời Kỹ Năng Chủ Động (Modal Mapping & Active Skills)

- **⚡ Chuẩn Hóa Ánh Xạ Modal (PriorityFrame to ViewModel):**
  - Khung Quyết Đấu `ASK_SLASH_DUEL` được ánh xạ thành `{ type: 'ask_slash', reason: 'quyet-dau', trickType: 'duel' }`, kích hoạt chính xác giao diện đọ Chém 1v1 trong `ModalContainer.jsx`.
  - Khung Dã Man `ASK_SLASH_RESPONSE` được ánh xạ thành `{ type: 'ask_slash', reason: 'nam-man', trickType: 'barbarian' }`.
  - Khung Loạn Tiễn `ASK_DODGE` mang thuộc tính `{ reason: 'van-tien', trickType: 'arrow_rain' }`, kích hoạt modal Né Loạn Tiễn chuyên biệt (cho phép gọi Tiên Phát, Hộ Giá, Thính Chính) và ngăn chặn việc vũ khí (Rìu Đá, Thanh Long Đao) can thiệp xuyên giáp vào đòn né cẩm nang diện rộng.
- **🛡️ Chương Dương Trang Bị (Equip Negate):** Kỹ năng của Trần Quang Khải cho phép tháo bỏ trực tiếp một món trang bị đang mặc (Vũ khí, Giáp, Ngựa) để sử dụng như một lá [Hóa Giải] hợp lệ, đồng thời kích hoạt sự kiện mất trang bị `ON_EQUIP_LOST`.
- **🌿 Vòng Đời Kỹ Năng Chủ Động (Active Skills Lifecycle):**
  - **Diệu Dược (Tuệ Tĩnh):** Bỏ 1 lá bài bất kỳ trên tay để chữa lành 1 HP cho một người chơi bị thương trên bàn.
  - **Hòa Thân (Huyền Trân Công Chúa):** Bỏ 1 lá bài trên tay để bắt buộc 2 tướng Nam bất kỳ bước vào trận Quyết Đấu sinh tử với nhau.
  - **Bình Loạn (Nguyễn Bặc):** Bỏ 2 lá bài cùng chất để kích hoạt hiệu ứng cẩm nang [Loạn Tiễn].
  - **Trung Dũng (Lê Ngân):** Úp 1 lá bài trên tay tuyên bố chức năng ảo như [Chém], [Đào], [Tước Bài], v.v. Kẻ thù có thể lựa chọn tin tưởng hoặc nghi ngờ.
  - **Thủy Tổ (Lạc Long Quân):** Giao bài cho đồng minh; nếu giao từ 2 lá trở lên thì nhận thêm khung thưởng `ASK_THUY_TO_BONUS` cho phép đánh ngay 1 Bài Cơ Bản miễn phí.
  - **Tự Chủ (Khúc Thừa Dụ):** Đấu điểm lật bài ngẫu nhiên với một tướng có lượng HP cao hơn mình. Thắng ép đối thủ Chém người khác; thua bị đối thủ Chém trả đũa.

