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

---

## 14. Kỹ Năng Chúa Công Quốc Chiến, Cửa Sổ Can Thiệp Phán Xét & Thưởng Phạt Đồng Minh (National War Lord Skills & Judgement Intercept)

- **🎁 Thưởng Hạ Địch & Phạt Ngộ Sát Quốc Chiến (Faction Kill Rewards & Friendly Fire Penalty):**
  - **Thưởng diệt địch:** Khi tiêu diệt một người chơi khác phe đã lộ diện, kẻ kết liễu được rút số lá bài bằng **số đồng minh đã lộ diện của nạn nhân + 1** (tối thiểu là 2 lá bài). Nếu tiêu diệt một kẻ mang dã tâm (Careerist), kẻ kết liễu chỉ nhận 1 lá bài thưởng.
  - **Phạt ngộ sát (Friendly Fire):** Khi tiêu diệt một đồng minh cùng phe đã lộ diện, kẻ kết liễu lập tức bị xử phạt **vứt bỏ toàn bộ số bài trên tay và toàn bộ trang bị đang mặc**.
- **🐉 Bọc Trăm Trứng (Lạc Long Quân - Phe Lạc):**
  - Khi cần ra lá [Né] (bị Chém, Loạn Tiễn) hoặc lá [Chém] (trong Quyết Đấu, Dã Man), Chúa công Lạc Long Quân có thể phát động `Bọc Trăm Trứng` để mở khung yêu cầu đồng minh `ASK_BOC_TRAM_TRUNG_DODGE` hoặc `ASK_BOC_TRAM_TRUNG_SLASH`.
  - Toàn bộ người chơi cùng phe Lạc còn sống sẽ được hỏi tuần tự theo hàng đợi xem có ai tình nguyện ra bài thay cho Chúa công hay không.
- **👑 Tiên Phát (Lý Thường Kiệt - Phe Việt):**
  - Khi Lý Thường Kiệt bị tấn công và cần dùng lá [Né], có thể phát động `Tiên Phát` tạo khung `ASK_TIEN_PHAT` để hỏi tuần tự các đồng minh phe Việt ra [Né] đỡ đòn giùm mình.
- **🤝 Hậu Viện (Ngô Quyền - Phe Hà):**
  - Khi một người chơi phe Hà sử dụng lá [Đào] chủ động trong lượt, nếu Ngô Quyền đang bị thương (`hp < maxHp`), hệ thống sẽ mở khung `ASK_HAU_VIEN` hỏi người chơi đó có muốn nhường quả Đào này cho Ngô Quyền hay không. Nếu đồng ý, Ngô Quyền hồi 1 HP và người nhường Đào được rút thưởng 1 lá bài từ bộ bài.
- **☯️ Cửa Sổ Can Thiệp Phán Xét (Pre-Judgement Intercept Window):**
  - Khi một cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn) đến giai đoạn phán xét, lá bài phán xét được rút tạm từ đỉnh bộ bài rút nhưng **chưa được áp dụng ngay**.
  - Hệ thống quét tất cả người chơi còn sống xem có ai sở hữu kỹ năng can thiệp phán xét như **Mạc Đĩnh Chi** (`Ứng Biến` - dùng bài bất kỳ trên tay) hoặc **Đinh Điền** (`Quân Cơ` - dùng bài đen trên tay) hay không.
  - Người chơi hợp lệ sẽ nhận được khung `ASK_CHANGE_JUDGE`. Nếu chấp thuận, lá bài phán xét cũ bị thay thế bởi lá bài được chọn từ tay người can thiệp, qua đó có thể trực tiếp cứu đồng minh thoát khỏi Sấm Sét nổ hoặc ép kẻ thù nổ lôi hỏa.
- **📊 Giới Hạn Bài Trên Tay Động (Dynamic Max Hand Limit Invariant):**
  - Mặc định, giới hạn bài trên tay tối đa trong Pha Bỏ bài bằng lượng HP hiện tại.
  - Tuy nhiên, kỹ năng **Khai Quốc** của Nguyễn Bặc cộng thêm **+2 Max Hand cho mỗi đồng minh Sơn còn sống**.
  - Kỹ năng **Hộ Chủ** của Nguyễn Địa Lô cho phép tính Max Hand bằng số lá bài Trung đã tích lũy.
  - Cả `StateMachine.js` và `GameInvariants.assertDiscardLimit` đều đồng bộ tính toán `effectiveMaxHand` chính xác, đảm bảo không có cảnh báo vi phạm giả (false positive).

---

## 15. Kỹ Năng Pha Hành Động, Đấu Điểm & Chuyển Hướng Chém (Action Phase Skills, Point Duel & Slash Redirection)

- **⚔️ Point Duel (Đấu Điểm - Vân Đồn):**
  - Kỹ năng chủ động của Trần Khánh Dư: Trong Pha Hành động, ông có thể thách đấu điểm số với 1 tướng khác còn bài trên tay.
  - Mỗi bên bí mật xuất 1 lá bài so sánh điểm số quy đổi chuẩn ($A=1, 2=2 \dots 10=10, J=11, Q=12, K=13$).
  - **Thắng:** Trần Khánh Dư được cộng dồn thêm 1 lần [Chém] trong lượt, đòn [Chém] này không bị giới hạn bởi cự ly và được phép chọn tối đa 2 mục tiêu cùng lúc (`vanDonWin`).
  - **Thua / Hòa:** Bị cấm sử dụng [Chém] trong toàn bộ thời gian còn lại của lượt (`vanDonLose`).
- **🛡️ Slash Redirection (Chuyển Hướng Chém - Xả Thân):**
  - Kỹ năng phản ứng của Công Chúa An Tư khi trở thành mục tiêu của một lá [Chém].
  - Trước khi cửa sổ Né được mở, An Tư có quyền bỏ 1 lá bài bất kỳ trên tay và đem cú [Chém] đó chuyển hướng sang một mục tiêu khác nằm trong tầm đánh của bà.
  - Sau khi chuyển hướng thành công, mục tiêu mới trở thành nạn nhân trực tiếp và bước vào khung phản hồi `ASK_DODGE`.
- **⏩ Phase Bypass / Skip Phase (Bỏ Qua Pha / Nhảy Pha - Nhiếp Chính):**
  - Kỹ năng của Tô Hiến Thành: Trong Pha Hành động (`ACTION`), nếu ông không sử dụng bất kỳ đòn [Chém] nào (`turnStats.slashCount === 0`), Engine sẽ bỏ qua hoàn toàn Pha Bỏ bài (`DISCARD`) và chuyển thẳng sang Pha Kết thúc (`END`), cho phép bảo toàn 100% bài trên tay bất kể HP hiện tại.

---

## 16. Hệ Thống Cẩm Nang, Hóa Giải Đơn Thể & Truyền Sát Thương Xiềng Xích (Trick Rules, Single-target Negate & Elemental Propagation)

- **🛡️ Single-target Negate (Hóa Giải Đơn Thể):**
  - Lá bài [Hóa Giải] thông thường chỉ có phạm vi tác dụng lên một **mục tiêu đơn lẻ**:
    - Với cẩm nang đơn thể (Quyết Đấu, Cướp Bài, Tước Bài, Mượn Đao, Hỏa Công): Hóa Giải bảo vệ mục tiêu duy nhất của lá bài.
    - Với cẩm nang toàn bàn (Loạn Tiễn, Dã Man, Hồi Xuân): **Không có cửa sổ hủy toàn bàn**. Cẩm nang được kích hoạt ngay; khi hiệu ứng tác động đến từng người chơi, nạn nhân đó (hoặc đồng minh của họ) có quyền dùng [Hóa Giải] để vô hiệu hóa tác động cho riêng bản thân nạn nhân đó.
    - Với cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn, Binh Lương Thốn Đoạn): [Hóa Giải] được kích hoạt trong Pha Phán xét để hủy bỏ cẩm nang đang chờ phán xét của cá nhân đó.
- **⛓️⚡ Chained Elemental Propagation (Truyền Sát Thương Chuỗi Xiềng Xích):**
  - Khi một người chơi đang bị Xiềng Xích (`isChained = true`) nhận sát thương nguyên tố (`fire`, `lightning`), trạng thái xích của nạn nhân sẽ được giải phóng (`isChained = false`).
  - Sát thương này lập tức truyền nguyên vẹn sang toàn bộ các người chơi khác đang bị Xích theo chuỗi phản ứng nguyên tử.
  - Toàn bộ người nhận truyền đều được tháo xích, và mỗi người kích hoạt độc lập trang bị/kỹ năng phòng thủ cá nhân của họ (ví dụ: giáp Bạch Ngân giảm sát thương dồn xuống 1).
- **🗡️ Passive Forced Slash (Cú Chém Ép Buộc - Mượn Đao Giết Người):**
  - Cú Chém do cẩm nang [Mượn Đao] ép buộc người chơi A xuất chiêu tấn công người chơi B là đòn phản hồi thụ động mang cờ `isRedirected: true`.
  - Cú Chém này hoàn toàn không tiêu tốn và không bị chặn bởi giới hạn 1 Chém/lượt của người chơi A (kể cả khi A đã Chém trước đó trong lượt hoặc lúc đó đang là lượt của người khác).
- **🌾 Delayed Trick Judgement - Binh Lương Thốn Đoạn (Phán Xét Binh Lương Thốn Đoạn):**
  - Cẩm nang trì hoãn đặt vào vùng phán xét của mục tiêu có khoảng cách $\le 1$.
  - Trong Pha Phán xét của nạn nhân: Lật 1 lá bài từ drawPile. Nếu kết quả là chất Nhép (♣) $\rightarrow$ thoát nạn. Nếu là bất kỳ chất nào khác $\rightarrow$ nạn nhân bị gán cờ `skipDrawPhase = true` (bị tước đoạt Pha Rút Bài trong lượt đó).
- **⚖️ Duel Non-wine Invariant (Bất Biến Quyết Đấu Không Dồn Rượu):**
  - Sát thương gây ra cho bên thua cuộc trong trận [Quyết Đấu] là 1 điểm sát thương thuộc tính `duel` gây ra bởi người chiến thắng.
  - Cờ [Rượu] (`wineActive`) chỉ có hiệu lực tăng sát thương cho lá bài [Chém], tuyệt đối không cộng dồn sát thương cho [Quyết Đấu] và không bị tiêu hao bởi [Quyết Đấu].

---

## 17. Hệ Thống Vũ Khí, Ánh Xạ Tầm Đánh & Cửa Sổ Kích Hoạt Chiến Đấu (Weapon System, Range Mapping & Combat Triggers)

- **🎯 Weapon Range Mapping (Bảng Ánh Xạ Tầm Đánh Cố Định):**
  - Khi một người chơi trang bị vũ khí, tầm công kích của đòn [Chém] được mở rộng tương ứng theo `WEAPON_RANGE_MAP`:
    - **Liên Nỏ (Tầm 1):** Không giới hạn số lượng lá [Chém] sử dụng trong Pha Hành Động.
    - **Song Kiếm (Tầm 2):** Khi Chém mục tiêu khác giới tính (Nam $\leftrightarrow$ Nữ), ép mục tiêu bỏ 1 lá bài hoặc cho mình rút 1 lá.
    - **Quạt Sắt / Cổ Đĩnh Đao (Tầm 2):** Gây thêm +1 sát thương khi mục tiêu không còn bài trên tay.
    - **Thanh Long Đao (Tầm 3):** Khi cú Chém bị Né, được lập tức đánh thêm 1 lá Chém nữa lên cùng mục tiêu mà không tính vào giới hạn lượt.
    - **Rìu Đá / Quán Thạch Phủ (Tầm 3):** Khi cú Chém bị Né, có thể bỏ 2 lá bài để xuyên giáp bắt buộc trúng.
    - **Phương Thiên Kích (Tầm 4):** Khi đòn Chém là lá bài duy nhất còn lại trên tay, có thể chỉ định tối đa 3 mục tiêu cùng lúc.
    - **Kỳ Lân Cung (Tầm 5):** Khi Chém gây sát thương thành công, được bắn hạ 1 con ngựa của nạn nhân vào chồng bài bỏ.
  - Bất kể lá bài vũ khí khởi tạo từ Deck hay qua kỹ năng biến đổi, nếu chưa có sẵn thuộc tính `range`, hệ thống luôn fallback chuẩn xác theo bảng trên thay vì rớt về cự ly mặc định 1.
- **🔄 Post-Dodge Weapon Triggers (Cửa Sổ Phản Ứng Sau Khi Né):**
  - Khi mục tiêu né thành công (bằng lá [Né] hoặc [Bát Quái]):
    - **Thanh Long Đao:** Nếu người tấn công còn bài Chém trên tay, hệ thống kích hoạt quyền đánh tiếp 1 lá [Chém] nối tiếp lên cùng mục tiêu.
    - **Rìu Đá:** Người tấn công có thể vứt bỏ 2 lá bài (trên tay hoặc trang bị) để vô hiệu hóa cú Né của đối phương, biến đòn Chém thành đòn đánh trúng đích trực tiếp.
- **⚡ Pre-Dodge Weapon Triggers (Cửa Sổ Kích Hoạt Trước Khi Né):**
  - **Song Kiếm:** Kích hoạt ngay khi đòn Chém được phát động lên mục tiêu khác giới. Nạn nhân phải bỏ 1 lá bài HOẶC cho người chém rút 1 lá bài. Quá trình này bắt buộc phải giải quyết xong trước khi nạn nhân được quyền đánh lá [Né].
  - **Phương Thiên Kích:** Kiểm tra điều kiện "lá bài duy nhất trên tay" ngay tại thời điểm chọn mục tiêu (`TargetResolverV4`). Cả 3 mục tiêu được chọn đều phải lần lượt đối mặt với yêu cầu Né độc lập.
- **💥 Damage Boost & Horse Sniping (Tăng Sát Thương & Bắn Hạ Ngựa):**
  - **Quạt Sắt:** Trong bước tính toán sát thương (`applyDamage`), nếu nạn nhân có `hand.length === 0`, tăng `damageAmount += 1`.
  - **Kỳ Lân Cung:** Trong bước `applyDamage`, khi đòn Chém gây sát thương, nếu nạn nhân có trang bị Ngựa phòng thủ (`horse_defense`), ngựa phòng thủ bị tiêu hủy trước; nếu không có thì tiêu hủy Ngựa tấn công (`horse_attack`).
- **🛡️ Single Weapon Slot & Disarm Invariant (Bất Biến Một Vũ Khí & Tước Vũ Khí):**
  - Mỗi người chơi chỉ được trang bị tối đa 1 vũ khí tại `equipment.weapon`. Trang bị vũ khí mới sẽ đưa vũ khí cũ vào `discardPile` và kích hoạt `ON_EQUIP_LOST`.
  - Khi vũ khí bị mất hoặc thay đổi, tầm đánh cơ bản lập tức trở về 1 (cộng trừ các hiệu ứng cự ly còn lại). Mọi chuỗi liên hoàn của vũ khí cũ lập tức chấm dứt.

---

## 18. Hệ Thống Phòng Cụ (Giáp), Phán Xét Bát Quái & Ranh Giới Miễn Nhiễm (Armor System, Bagua Judgement & Immunity Boundaries)

- **☯️ Bát Quái (Eight Trigrams - Bagua Array):**
  - Khi chủ nhân cần đánh ra lá [Né] (trước đòn [Chém] của đối thủ hoặc đòn [Loạn Tiễn] toàn bàn), chủ nhân có quyền tiến hành Phán xét từ đỉnh chồng bài rút.
  - Nếu kết quả phán xét là bài màu ĐỎ (♥️, ♦️), lá bài phán xét được tính như một lá [Né] hợp lệ (`dodgesProvided += 1`).
  - Nếu kết quả là bài màu ĐEN (♠️, ♣️), phán xét thất bại nhưng chủ nhân vẫn có toàn quyền đánh ra lá [Né] từ trên tay.
  - **Giới hạn phán xét:** Bát Quái chỉ được phán xét tối đa 1 lần cho mỗi lượt yêu cầu Né (`baguaAttempted: true`).
  - **Tương tác với đòn Chém bắt 2 Né (Nguyễn Xí - Phá Quân):** Nếu Bát Quái phán xét Đỏ thành công (cung cấp 1 Né), chủ nhân chỉ cần tự đánh thêm 1 lá [Né] từ trên tay để né trọn vẹn đòn Chém.
- **🛡️ Hắc Thuẫn (Black Shield / Renwang Shield):**
  - Chủ nhân được **miễn nhiễm 100% trước tất cả các lá bài [Chém] có màu Đen** (♠️, ♣️). Khi một đòn Chém Đen nhắm vào, đòn Chém lập tức bị hủy bỏ vô hại, không mở cửa sổ Né.
  - **Ranh giới miễn nhiễm bất biến:** Hắc Thuẫn tuyệt đối KHÔNG có tác dụng trước: đòn Chém màu Đỏ, trận [Quyết Đấu] (kể cả khi đối phương ra Chém đen trong Duel), đợt công kích [Dã Man], [Loạn Tiễn], [Hỏa Công] hay [Sấm Sét].
  - **Chém biến đổi ảo (Virtual Slash):** Nếu đối phương dùng kỹ năng chuyển hóa một lá bài Đen thành lá Chém, Hắc Thuẫn vẫn nhận diện màu Đen thực tế và chặn đứng đòn Chém thành công.
- **🦁 Bạch Ngân (Silver Lion Armor):**
  - **Khóa trần sát thương dồn:** Bất kỳ nguồn sát thương đơn lẻ nào $\ge 2$ (3 HP từ [Sấm Sét], 2 HP từ Chém có [Rượu], 2 HP từ [Quạt Sắt] khi hết bài) khi đánh vào chủ nhân mang Bạch Ngân đều bị triệt tiêu bớt, chỉ gây đúng **1 điểm sát thương**.
  - **Hồi phục khi rời người (Heal on Leave):** Bất cứ khi nào Bạch Ngân rời khỏi ô `equipment.armor` (do bị Tước Bài, Cướp Bài, tháo bỏ bằng kỹ năng như [Chương Dương] của Trần Quang Khải, hoặc bị thay thế bởi một lá Giáp mới), chủ nhân được hồi phục ngay 1 HP (`hp = Math.min(maxHp, hp + 1)`).
- **🐢 Single Armor Slot & Thần Giáp (Bất Biến Một Giáp & Giáp Bẩm Sinh):**
  - Mỗi người chơi chỉ sở hữu tối đa 1 ô Giáp (`equipment.armor`). Trang bị giáp mới sẽ lập tức đưa giáp cũ vào `discardPile` và kích hoạt `ON_EQUIP_LOST`.
  - Kỹ năng **Thần Giáp** của Rùa Vàng (tương đương Bát Quái bẩm sinh) chỉ có hiệu lực khi Rùa Vàng **KHÔNG mặc bất kỳ giáp nào**. Nếu Rùa Vàng trang bị giáp vật lý (Hắc Thuẫn hoặc Bạch Ngân), giáp vật lý sẽ thay thế Thần Giáp và có hiệu lực trực tiếp.

---

## 19. Hệ Thống Tọa Kỵ (Ngựa), Tính Cự Ly Hiệu Dụng & Bắn Hạ Tọa Kỵ (Mount System, Effective Distance & Mount Sniping)

- **🐎 Hai Ô Trang Bị Tọa Kỵ Độc Lập (Dual Independent Mount Slots):**
  - Người chơi sở hữu 2 ô Tọa Kỵ riêng biệt trong khu vực Trang Bị:
    - `equipment.horse_attack`: Ô Ngựa Tấn Công (-1 cự ly khi tấn công người khác, phân loại `equip_mount_atk`).
    - `equipment.horse_defense`: Ô Ngựa Phòng Thủ (+1 cự ly khi người khác tính cự ly tới mình, phân loại `equip_mount_def`).
  - Một người chơi có thể trang bị đồng thời cả 1 Ngựa Tấn Công và 1 Ngựa Phòng Thủ. Trang bị một con ngựa mới cùng ô sẽ đưa con ngựa cũ vào `discardPile` và kích hoạt sự kiện `ON_EQUIP_LOST`.
  - Bộ bài chuẩn 106 lá chứa đúng 6 lá Tọa Kỵ: 3 lá [Ngựa Chiến (-1)] và 3 lá [Ngựa Thần (+1)].
- **📏 Công Thức Cự Ly Hiệu Dụng & Sàn Cự Ly Tối Thiểu (Effective Distance & Minimum Floor):**
  - Cự ly vật lý vòng tròn: $D_{\text{raw}} = \min(|i - j|, N - |i - j|)$ ($N$ là tổng số người còn sống).
  - Cự ly hiệu dụng khi $i$ tiếp cận hoặc tấn công $j$:
    $$D_{\text{eff}} = \max(1, D_{\text{raw}} - \text{AtkMod} + \text{DefMod})$$
  - **Sàn cự ly bất biến:** Bất kể hệ số rút ngắn khoảng cách $\text{AtkMod}$ lớn đến đâu, khoảng cách hiệu dụng giữa hai người chơi khác nhau luôn có giá trị tối thiểu là 1 ($D_{\text{eff}} \ge 1$).
- **✨ Cộng Dồn Độc Lập Với Kỹ Năng Tướng (Skill Stacking Invariants):**
  - **Thánh Gióng — Thiết Mã:** Giảm cự ly từ Gióng đến người khác đi 1. Khi Gióng trang bị thêm [Ngựa Chiến (-1)], tổng mức giảm là **-2** (người ở cự ly gốc 3 sẽ thành cự ly 1).
  - **Sơn Tinh — Dời Núi:** Tăng cự ly từ người khác đến Sơn Tinh thêm 1. Khi Sơn Tinh trang bị thêm [Ngựa Thần (+1)], tổng mức tăng là **+2** (kẻ địch kề bên cự ly gốc 1 sẽ nhìn Sơn Tinh ở cự ly 3).
  - **Tiên Dung — Tiên Duyên:** Tăng cự ly từ người chơi khác giới tính đến Tiên Dung thêm 1, cộng dồn độc lập với Ngựa Phòng Thủ (+1).
- **🤏 Ranh Giới Với Cẩm Nang Cự Ly (Trick Distance Boundaries):**
  - **Cướp Bài (Snatch):** Bắt buộc cự ly hiệu dụng $D_{\text{eff}} \le 1$. Nếu mục tiêu kề bên ($D_{\text{raw}} = 1$) có trang bị [Ngựa Thần (+1)], $D_{\text{eff}} = 2 \rightarrow$ Kẻ địch không thể phát động [Cướp Bài] nếu không sở hữu [Ngựa Chiến (-1)] hoặc kỹ năng vô hiệu hóa cự ly cẩm nang.
  - **Tước Bài (Dismantle):** Khoảng cách bất kỳ $\rightarrow$ Hoàn toàn không bị cản trở bởi Ngựa Phòng Thủ.
- **🏹 Bắn Hạ Tọa Kỵ Bởi Kỳ Lân Cung (Kylin Bow Horse Sniping):**
  - Khi tướng sử dụng [Kỳ Lân Cung] (Tầm 5) gây sát thương bằng [Chém] lên nạn nhân có trang bị Ngựa, xạ thủ có quyền bắn hạ 1 con ngựa của nạn nhân:
  - **Thứ tự ưu tiên:** Bắn hạ `horse_defense` trước; nếu không có mới bắn hạ `horse_attack`.
  - Ngựa bị bắn hạ chuyển thẳng vào `discardPile` và kích hoạt trigger `ON_EQUIP_LOST` (cho phép Hồ Xuân Hương rút 2 bài qua kỹ năng Xuân Hương).

---

## 20. Tướng Hệ Lạc — Thánh Gióng (Thanh Giong: Iron Horse & Golden Bamboo)

- **🐎 Thiết Mã (Iron Horse - Lock Skill):**
  - Kỹ năng Tỏa Định Kỹ bẩm sinh: Khoảng cách từ Thánh Gióng đến tất cả các người chơi khác luôn được tính là -1.
  - Áp dụng xuyên suốt cho cả đòn [Chém], cẩm nang [Cướp Bài] và tầm công kích của vũ khí.
  - Cộng dồn hợp lệ với [Ngựa Chiến (-1)] thành tổng mức giảm -2 cự ly, tuân thủ sàn khoảng cách tối thiểu $\ge 1$.
- **🎋 Tre Ngà — Khóa Kỹ Năng Đến Hết Lượt (Golden Bamboo - Skill Suppression):**
  - Khi Thánh Gióng sử dụng lá [Chém] chỉ định mục tiêu, toàn bộ kỹ năng không phải Tỏa Định Kỹ của nạn nhân bị phong ấn cho đến hết lượt (`skillsSuppressed = true`).
  - Nạn nhân không thể dùng kỹ năng phản ứng chuyển hướng ([Xả Thân] của Công Chúa An Tư), không thể phát động [Tiên Phát] hay [Bọc Trăm Trứng], và không thể kích hoạt [Xuân Hương] hay [Hòa Nghị] khi mất đồ/chịu sát thương.
  - Các kỹ năng Tỏa Định Kỹ (như [Thần Giáp] của Rùa Vàng, [Đạm Bạc] của Lang Liêu) vẫn giữ nguyên hiệu lực.
- **🎋 Tre Ngà — Phán Xét Bắt Buộc Cùng Chất (Strict Suit Discard):**
  - Đòn [Chém] kích hoạt phán xét rút 1 lá bài từ chồng rút (`judgeSuit`).
  - Nạn nhân chỉ được phép giữ quyền đánh lá [Né] nếu vứt bỏ được 1 lá bài trên tay có **chất trùng khớp tuyệt đối** với kết quả phán xét (`card.suit === judgeSuit`).
  - Nếu nạn nhân không bỏ bài, hoặc chọn sai chất bài: đòn [Chém] trở thành không thể tránh né (`unavoidable = true`), lập tức đánh trúng đích và gây sát thương.

---

## 21. Tướng Hệ Lạc — Sơn Tinh (Son Tinh: Mountain Moving & Dual Arts)

- **⛰️ Cự Ly Phòng Thủ Dời Núi (+1 Defensive Distance):**
  - Khi Sơn Tinh đã lộ diện danh tính (`revealedHeroes[target.id] === true`), khoảng cách từ tất cả người chơi khác tính đến Sơn Tinh luôn được tăng thêm 1 (+1 cự ly phòng thủ bẩm sinh).
  - Cộng dồn hoàn hảo với trang bị [Ngựa Thần (+1)] thành tổng mức gia tăng cự ly là +2.
  - Khi Sơn Tinh chưa lộ diện, kỹ năng ẩn mình và không tác động lên phép tính cự ly của các người chơi khác.
- **🛡️ Song Chiêu Dời Núi — Dùng [Chém] Thay [Né] (Slash as Dodge):**
  - Khi đối mặt với đòn [Chém] của đối thủ hoặc các cẩm nang sát thương yêu cầu Né ([Loạn Tiễn]), Sơn Tinh có thể sử dụng bất kỳ lá bài [Chém] nào trên tay như một lá [Né] hợp lệ để hóa giải đòn đánh.
  - Bot AI tự động ưu tiên né bằng lá [Né] thật, nếu hết Né sẽ tự động đánh lá [Chém] để phòng thủ.
- **⚔️ Song Chiêu Dời Núi — Dùng [Né] Thay [Chém] (Dodge as Slash):**
  - **Pha Hành Động:** Sơn Tinh có thể xuất chiêu bất kỳ lá bài [Né] nào trên tay như một lá [Chém] hợp lệ lên mục tiêu trong tầm đánh (áp dụng đầy đủ giới hạn 1 Chém/lượt trừ khi có Liên Nỏ).
  - **Quyết Đấu & Dã Man:** Khi bị khiêu chiến trong [Quyết Đấu] hoặc chống đỡ [Dã Man], Sơn Tinh có quyền đánh lá [Né] để thay thế đòn [Chém] đáp trả, bảo toàn lượng máu của mình.

---

## 22. Tướng Hệ Lạc — Cao Lỗ (Cao Lo: Divine Crossbow)

- **🎯 Nỏ Thần — Tầm Đánh Bằng Điểm Số (Card Rank as Attack Range):**
  - Tầm công kích hiệu dụng của lá bài [Chém] do Cao Lỗ đánh ra bằng đúng giá trị điểm số ghi trên lá bài đó (`attackRange = card.rank`).
  - Cho phép vươn tới các mục tiêu ở khoảng cách xa (kể cả khoảng cách 5, 8, hay 13) mà không cần trang bị thêm vũ khí tầm xa.
- **🚫 Nỏ Thần — Khóa Né Khi Bài Tay Áp Đảo (Hand Size Dominance):**
  - Tại thời điểm đòn [Chém] nhắm vào mục tiêu, nếu số lá bài trên tay hiện tại của Cao Lỗ không ít hơn số lá bài trên tay của mục tiêu (`owner.hand.length >= target.hand.length`), đòn Chém trở thành không thể tránh né (`unavoidable = true`).
  - Nạn nhân bị cước đoạt toàn bộ quyền sử dụng lá [Né] trên tay cũng như cơ hội phán xét [Bát Quái] và phải trực tiếp nhận sát thương.
- **💥 Nỏ Thần — Tăng Sát Thương Khi Máu Nghịch Cảnh (HP Underdog Damage Boost):**
  - Nếu lượng máu hiện tại của Cao Lỗ không nhiều hơn lượng máu của mục tiêu (`owner.hp <= target.hp`), đòn [Chém] được tăng thêm +1 điểm sát thương.
  - Khi dồn kết hợp với cờ [Rượu] (`wineActive = true`), phát bắn Nỏ Thần có thể đạt tới 3 điểm sát thương trong một lần xuất chiêu.

---

## 23. Tướng Hệ Lạc — Thần Trụ Trời (Than Tru Troi: Heaven Creation)

- **🔴 Khai Thiên — Dùng Bài Đỏ Làm [Chém] (Red Cards as Slash):**
  - Trong Pha Hành Động, Thần Trụ Trời có thể sử dụng bất kỳ lá bài màu ĐỎ nào (Cơ bản Đào/Né/Rượu, Cẩm Nang Vô Trung/Hỏa Công, hoặc Trang Bị Đỏ) như một lá bài [Chém] hợp lệ.
  - Tuân thủ giới hạn 1 Chém/lượt trừ khi trang bị [Liên Nỏ], và cự ly tấn công tuân thủ theo bảng tầm đánh bình thường.
- **🛡️ Khắc Chế Hắc Thuẫn Bằng Chém Đỏ (Red Slash vs Black Shield):**
  - Mọi đòn Chém tạo ra từ Khai Thiên đều mang thuộc tính màu ĐỎ (`color = 'red'`).
  - Do đó, đòn đánh hoàn toàn không bị Giáp [Hắc Thuẫn] (chỉ miễn nhiễm Chém màu Đen) ngăn chặn, ép đối phương phải xuất chiêu Né hoặc chịu sát thương.
- **⚔️ Khai Thiên Trong Quyết Đấu & Dã Man (Duel & Barbarian Red Response):**
  - Khi đối mặt với [Quyết Đấu] hoặc chống đỡ [Dã Man Xâm Nhập], Thần Trụ Trời có quyền đánh bất kỳ lá bài Đỏ nào trên tay để thay thế đòn Chém phản hồi.
  - Bot AI tự động nhận diện và sử dụng bài Đỏ thừa (ưu tiên giữ lại Đào) để bảo toàn HP trong các tình huống chiến đấu sinh tử.

---

## 24. Tướng Hệ Lạc — Rùa Vàng (Rua Vang: Divine Armor, Fire & Negate)

- **🛡️ Thần Giáp — Bát Quái Bẩm Sinh (Innate Bagua Array):**
  - Khi chưa trang bị bất kỳ lá Giáp nào (`!equipment.armor`), Rùa Vàng tự động thụ hưởng hiệu ứng của [Bát Quái Trận]: phán xét lật bài Đỏ (♥, ♦) được tính như một lá [Né] thành công.
  - Nếu phán xét ra bài Đen (♠, ♣), phán xét thất bại nhưng Rùa Vàng vẫn giữ trọn quyền sử dụng lá [Né] từ trên tay để né đòn hoặc chấp nhận mất máu.
  - Thần Giáp là Tỏa Định Kỹ (`isLockSkill = true`), không bị phong ấn bởi kỹ năng [Tre Ngà] của Thánh Gióng. Khi trang bị Giáp khác (Bạch Ngân, Hắc Thuẫn), Thần Giáp tạm thời nhường chỗ cho hiệu ứng của giáp đang mặc.
- **🔥 Thần Hỏa — Biến Bài Đỏ Thành [Hỏa Công] (Red Cards as Fire Attack):**
  - Rùa Vàng có thể sử dụng bất kỳ lá bài màu ĐỎ nào trên tay phát động cẩm nang [Hỏa Công] lên mục tiêu còn bài trên tay.
- **📜 Linh Giám — Biến Bài Đen Thành [Hóa Giải] (Black Cards as Negate):**
  - Rùa Vàng có thể sử dụng bất kỳ lá bài màu ĐEN nào (♠, ♣) từ trên tay để [Hóa Giải] cẩm nang của đối phương hoặc bảo vệ bản thân và đồng minh khỏi các cẩm nang sát thương nguy hiểm.

---

## 25. Tướng Hệ Lạc — Chử Đồng Tử (Chu Dong Tu: Ascension & Immortal Bond)

- **🌟 Hóa Tiên — Hồi Sinh Thần Kỳ Khi Hấp Hối (Limited Dying Revival):**
  - Khi Chử Đồng Tử nhận sát thương chí tử khiến lượng máu giảm về $\le 0$ HP, [Hóa Tiên] lập tức kích hoạt:
    - Vứt bỏ toàn bộ bài trên tay, toàn bộ trang bị, và toàn bộ cẩm nang trì hoãn trong khu phán xét.
    - Hồi phục trọn vẹn 3 HP tối đa (`hp = 3`).
    - Rút ngay 3 lá bài mới từ đầu bộ bài rút (`drawCards(0, 3)`).
    - Hủy bỏ trạng thái Hấp hối mà không cần sử dụng bất kỳ lá [Đào] hay [Rượu] nào.
  - **Hạn Định Kỹ (Limited Skill):** Chỉ kích hoạt duy nhất một lần trong toàn bộ trận đấu (`usedThisGame = true`).
- **⛓️ Tiên Duyên — Biến Đổi Bài ♣ Thành [Xiềng Xích] (Club Cards as Iron Chain):**
  - Chử Đồng Tử có thể sử dụng bất kỳ lá bài chất ♣ (Nhép / Club) nào trên tay để phát động cẩm nang [Xiềng Xích] (khóa/mở xích 1 đến 2 người chơi).
  - Có thể chọn [Rèn Lại] (Reforge) lá bài ♣ đó để rút 1 lá bài mới từ bộ bài rút mà không kích hoạt vòng Hóa Giải.

---

## 26. Tướng Hệ Lạc — Tiên Dung (Tien Dung: Fairy Fate & Immortal Grace)

- **🌸 Duyên Tiên — Rút Bài Khi Chơi Cẩm Nang Thường (Draw on Non-delayed Trick):**
  - Mỗi khi Tiên Dung đánh ra một lá Cẩm Nang thường (Quyết Đấu, Cướp Bài, Tước Bài, Vô Trung Sinh Hữu, Hỏa Công, Xiềng Xích, Loạn Tiễn, Dã Man, Hồi Xuân, Mượn Đao), Tiên Dung được rút ngay 1 lá bài từ bộ bài rút.
  - Khi chơi [Vô Trung Sinh Hữu], hiệu ứng cộng dồn cho phép Tiên Dung thu về tổng cộng 3 lá bài (1 lá từ Duyên Tiên + 2 lá từ Vô Trung).
  - Không kích hoạt đối với các Cẩm Nang Trì Hoãn (Sấm Sét, Hỗn Loạn, Binh Lương Thốn Đoạn).
- **🗺️ Tiên Duyên — Cẩm Nang Vô Hạn Cự Ly (Infinite Trick Range):**
  - Tiên Dung khi thi triển các Cẩm Nang bị giới hạn khoảng cách (như [Cướp Bài], [Binh Lương Thốn Đoạn]) được bỏ qua hoàn toàn điều kiện cự ly $\le 1$, có thể chỉ định bất kỳ mục tiêu hợp lệ nào trên bàn cờ.
- **🛡️ Tiên Duyên — Cự Ly Phòng Thủ Trước Người Khác Giới (+1 Defense vs Men):**
  - Khi đã lộ diện danh tính (`revealedHeroes[target.id] === true`), khoảng cách từ tất cả người chơi Nam (khác giới tính) tính đến Tiên Dung luôn được tăng thêm 1.
  - Người chơi cùng giới tính Nữ tính khoảng cách đến Tiên Dung không chịu ảnh hưởng của hiệu ứng này.

---

## 27. Tướng Hệ Lạc — Lang Liêu (Lang Lieu: Banh Chung & Dam Bac)

- **🍡 Bánh Chưng — Thấu Thị & An Bài Thiên Mệnh (Quan Tinh - Deck Top/Bottom Reordering):**
  - **Thời điểm kích hoạt:** Đầu lượt chơi của Lang Liêu (Pha Bắt đầu - BEGIN Phase).
  - **Phạm vi xem:** $X = \min(\text{alivePlayersCount}, 5)$ lá bài trên đỉnh chồng bài rút. Tự động xào bài an toàn nếu bộ bài rút không đủ số lượng.
  - **Cơ chế xếp bài:** Lang Liêu tùy ý phân bổ và sắp xếp các lá bài đã xem thành 2 phần:
    - **Đặt lên đỉnh (Deck Top):** Các lá bài này sẽ lần lượt được rút ra đầu tiên ở các pha tiếp theo (Pha Phán xét, Pha Rút bài).
    - **Đặt xuống đáy (Deck Bottom):** Các lá bài này được đưa xuống đáy cùng của bộ bài rút, tạm thời loại khỏi chu kỳ rút bài trước mắt.
  - Sau khi sắp xếp xong, hệ thống tự động đẩy nhịp trận đấu sang Pha Phán xét (`PHASES.JUDGE`) và Pha Rút bài (`PHASES.DRAW`).
- **🌾 Đạm Bạc — Thủ Khuyết Vi Lạc, Miễn Nhiễm Công Kích (Zero-Hand Immune to Slash & Duel):**
  - **Tỏa Định Kỹ (Lock Skill):** Luôn có hiệu lực tự động khi điều kiện được thỏa mãn.
  - **Điều kiện kích hoạt:** Khi số bài trên tay của Lang Liêu bằng 0 (`hand.length === 0`).
  - **Hiệu ứng bảo hộ:**
    - Không thể bị chọn làm mục tiêu của bất kỳ lá [Chém] (Slash) nào (kể cả Chém thường, Chém Hỏa, Chém Lôi hay Chém từ vũ khí đặc biệt).
    - Không thể bị chọn làm mục tiêu của cẩm nang [Quyết Đấu] (Duel).
  - **Ngoại lệ:** Vẫn chịu ảnh hưởng bình thường từ các cẩm nang phá hủy/trộm cướp ([Cướp Bài], [Quá Hà Tách Cầu]), cẩm nang diện rộng ([Nam Man Xâm Nhập], [Vạn Tiễn Quy Tâm]), và sát thương thuộc tính từ [Hỏa Công], [Sấm Sét].

---

## 28. Tướng Hệ Lạc — Lạc Long Quân (Lac Long Quan: Lord of Lac Faction)

- **🌊 Thủy Tổ — Ban Phát Quân Nhu & Thưởng Bài Cơ Bản (Ancestral Card Transfer & Free Basic Card):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra Bài (`PHASES.ACTION`).
  - **Cơ chế chuyển bài:** Lạc Long Quân chọn 1 đồng minh và giao một số lượng bài tùy ý từ bài trên tay. Bài được chuyển giao nguyên tử, an toàn sang tay đồng minh.
  - **Hiệu ứng Thưởng (Bonus):**
    - Nếu giao **từ 2 lá bài trở lên** trong cùng một lần phát động, Lạc Long Quân kích hoạt trạng thái Thưởng Thủy Tổ (`ASK_THUY_TO_BONUS`).
    - Được quyền sử dụng ngay **1 lá Bài Cơ Bản miễn phí** mà không tốn bất kỳ lá bài nào trên tay:
      - **[Đào]:** Tự hồi phục 1 HP (nếu chưa đầy máu).
      - **[Rượu]:** Uống Rượu kích hoạt cờ say rượu (`wineActive = true`), tăng +1 sát thương cho cú Chém tiếp theo.
      - **[Chém]:** Tung ra một đòn Chém ảo vào một mục tiêu đối địch trong tầm đánh, buộc đối thủ phải dùng [Né].
- **🐉 Bọc Trăm Trứng — Chúa Công Kỹ Đồng Minh Trợ Chiến (Lord Skill: Allied Defense & Duel Support):**
  - **Chúa Công Kỹ (Lord Skill):** Kỹ năng đặc quyền của Chúa Công phe Lạc.
  - **Khi cần [Né] (đỡ Chém):**
    - Lạc Long Quân có thể kêu gọi toàn bộ tướng đồng minh thuộc phe Lạc trên bàn cờ ra [Né] giùm mình (`ASK_BOC_TRAM_TRUNG_DODGE`).
    - Lượt hỏi ưu tiên tuần tự qua từng đồng minh phe Lạc.
    - Nếu có một đồng minh đánh ra lá [Né], cú Chém nhắm vào Lạc Long Quân lập tức bị vô hiệu hóa, Lạc Long Quân không mất bài hay máu.
  - **Khi cần [Chém] (trong Quyết Đấu hoặc đối phó Nam Man Xâm Nhập):**
    - Lạc Long Quân có thể kêu gọi đồng minh phe Lạc đánh ra lá [Chém] giùm mình (`ASK_BOC_TRAM_TRUNG_SLASH`).
    - Khi đồng minh đánh [Chém] giùm, lượt Quyết Đấu tiếp tục chuyển lại cho đối thủ khiêu chiến.

---

## 29. Tướng Hệ Việt — Triệu Quang Phục (Trieu Quang Phuc: Night Swamp Guerrilla)

- **🌙 Dạ Trạch — Du Kích Tước Đoạt, Cướp Bài Thay Rút (Draw Phase Hand Theft):**
  - **Thời điểm kích hoạt:** Giai đoạn Rút bài (Pha Rút bài - DRAW Phase) của Triệu Quang Phục.
  - **Điều kiện phát động:** Tối thiểu 1 người chơi khác còn sống có ít nhất 1 lá bài trên tay.
  - **Hiệu ứng kỹ năng:**
    - Triệu Quang Phục có thể từ bỏ việc rút 2 lá bài thông thường từ chồng bài rút (`skipDrawPhase = true`).
    - Chọn **tối đa 2 người chơi khác** trên bàn đấu: rút trộm ngẫu nhiên 1 lá bài trên tay của mỗi người được chọn về bài trên tay của mình.
    - Nếu từ chối kích hoạt (`skip` / `cancel`): Triệu Quang Phục rút 2 lá bài bình thường từ đỉnh bộ bài rút.
  - Sau khi giải quyết xong kỹ năng Dạ Trạch, hệ thống tự động chuyển tiếp nhịp chơi sang Pha Ra bài (`PHASES.ACTION`).

---

## 30. Tướng Hệ Việt — Phùng Hưng (Phung Hung: Uprising & Brutal Might)

- **🔥 Khởi Nghĩa — Tinh Giản Quân Nhu, Bạo Tăng Sát Thương (Draw Less for +1 Damage):**
  - **Thời điểm kích hoạt:** Giai đoạn Rút bài (Pha Rút bài - DRAW Phase) của Phùng Hưng.
  - **Cơ chế đánh đổi:**
    - Phùng Hưng có thể chọn rút ít hơn 1 lá bài: chỉ rút **1 lá bài** từ bộ bài rút (`drawCardCount = 1`) thay vì 2 lá mặc định.
    - Đổi lại, Phùng Hưng nhận được cờ tăng cường hỏa lực `bonusDamage = 1` kéo dài xuyên suốt lượt chơi hiện tại.
  - **Hiệu lực tăng sát thương:**
    - **Cú Chém [Chém]:** Sát thương cơ bản tăng từ 1 lên **2 điểm HP** (nếu kết hợp [Rượu] thì bộc phá lên tới **3 điểm HP**).
    - **Cẩm nang [Quyết Đấu]:** Khi Phùng Hưng chiến thắng trong một trận Quyết Đấu, kẻ thua cuộc phải nhận **2 điểm sát thương** thay vì 1 điểm thông thường.
  - Nếu từ chối sử dụng Khởi Nghĩa: Phùng Hưng rút đủ 2 lá bài và các đòn đánh giữ nguyên sát thương chuẩn.

---

## 31. Tướng Hệ Việt — Khúc Thừa Dụ (Khuc Thua Du: Autonomy & Benevolent Relief)

- **⚖️ Tự Chủ — Đấu Điểm Quyền Mưu, Ép Địch Tương Tàn (Point Duel & Forced Slash):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Cơ chế đấu điểm:** Khúc Thừa Dụ chọn 1 tướng có HP hiện tại cao hơn mình và cả hai cùng úp bỏ 1 lá bài trên tay xuống chồng bài bỏ.
  - **Kết quả so sánh rank điểm:**
    - **Khúc Thừa Dụ thắng (`myRank > oppRank`):** Kẻ địch bị ép phải phát động một đòn [Chém] tấn công một người chơi khác do trận đấu chỉ định.
    - **Khúc Thừa Dụ thua hoặc hòa (`myRank <= oppRank`):** Kẻ địch lập tức chém thẳng vào Khúc Thừa Dụ.
- **🕊️ Khoan Dân — Bù Đắp Quân Lương, Đầy Tràn Sinh Lực (Relief Draw to Max HP):**
  - **Phản Ứng Kỹ (Reactive Skill):** Kích hoạt mỗi khi Khúc Thừa Dụ nhận sát thương (`ON_DAMAGED`).
  - **Hiệu ứng cứu trợ:** Khúc Thừa Dụ có thể chỉ định 1 người chơi (chính mình hoặc đồng minh) rút bài từ bộ bài rút cho đến khi số lượng bài trên tay bằng với lượng máu tối đa (`maxHp`, tối đa 5 lá).

---

## 32. Tướng Hệ Việt — Dương Đình Nghệ (Duong Dinh Nghe: Shen Su Rapid Assault)

- **⚡ Dưỡng Quân — Thần Tốc Tốc Chiến (Rapid Slash Assault):**
  - Kỹ năng chiến thuật linh hoạt bao gồm 3 lựa chọn đánh đổi để tung ra đòn [Chém] ảo vô hạn cự ly (`infiniteRange: true`), hoàn toàn bỏ qua khoảng cách và trang bị ngựa phòng thủ của địch:
    - **Lựa chọn 1 (Pha Bắt đầu - `duong_quan_1`):** Bỏ qua Pha Phán xét (`skipJudgePhase`) và Pha Rút bài (`skipDrawPhase`) để lập tức Chém thần tốc vào 1 mục tiêu bất kỳ. Sau khi giải quyết phản hồi Né, tiến thẳng vào Pha Ra bài (`PHASES.ACTION`).
    - **Lựa chọn 2 (Pha Ra bài - `duong_quan`):** Bỏ 1 lá bài Trang bị (từ tay hoặc trên người) để Chém thần tốc vào 1 mục tiêu bất kỳ. Sau khi đòn Chém giải quyết xong, Pha Ra bài lập tức bị cưỡng chế kết thúc và chuyển sang Pha Bỏ bài (`PHASES.DISCARD`).
    - **Lựa chọn 3 (Pha Bỏ bài - `duong_quan_3`):** Khi mặt tướng đang ngửa (`isFaceUp === true`), tự lật úp mặt tướng (`isFaceUp = false`) để bỏ qua Pha Bỏ bài (`skipDiscardPhase`) và Chém thần tốc vào 1 mục tiêu bất kỳ. Sau khi giải quyết phản hồi Né, hoàn tất lượt và chuyển lượt sang người chơi tiếp theo.
  - **Đặc tính đòn Chém:** Đòn Chém do Dưỡng Quân phát động là đòn Chém ảo (virtual), không tiêu tốn lá bài [Chém] từ tay và không tính vào giới hạn 1 Chém/lượt của Pha Ra bài.

---

## 33. Tướng Hệ Việt — Lý Thường Kiệt (Ly Thuong Kiet: Lord of Viet Faction)

- **📜 Nam Quốc Sơn Hà — Phản Đòn Chiến Lược, Thu Hồi Binh Khí (Counter Draw & Weapon Recovery):**
  - **Phản Ứng Kỹ (Reactive Skill):** Kích hoạt mỗi khi Lý Thường Kiệt nhận sát thương từ bất kỳ nguồn nào (`ON_DAMAGED`).
  - **Hiệu ứng:** Lý Thường Kiệt lập tức rút 1 lá bài từ chồng bài rút (`drawPile`), đồng thời nếu lá bài gây sát thương là lá bài vật lý nằm trong chồng bài bỏ (`discardPile`), ông sẽ thu hồi trực tiếp lá bài đó vào bài tay của mình.
- **👑 Tiên Phát — Chúa Công Kỹ Triệu Tập Hộ Vệ (Lord Dodge Call):**
  - **Chủ Công Kỹ (Lord Skill):** Khi Lý Thường Kiệt là mục tiêu của một cú [Chém] và cần đánh ra [Né] (`ASK_DODGE`), ông có thể phát động Tiên Phát để kêu gọi đồng minh phe Việt ra [Né] hộ mình.
  - Các đồng minh phe Việt còn sống được truy vấn tuần tự. Nếu bất kỳ đồng minh nào đánh ra 1 lá [Né], đòn Chém được giải trừ thành công và Lý Thường Kiệt không nhận bất kỳ sát thương nào.

---

## 34. Tướng Hệ Việt — Trần Quang Khải (Tran Quang Khai: Garrison Draw & Defense Negate)

- **⭐ Đoạt Sáo — Cố Thủ Binh Lực, Tự Động Quân Bị (Garrison Draw & Auto Equip):**
  - **Phản Ứng Kỹ (Reactive Skill):** Kích hoạt tại Pha Kết thúc (`PHASES.END`).
  - **Cơ chế:** Trần Quang Khải lật mặt tướng (`isFaceUp` đảo chiều, chuyển sang úp nếu đang ngửa) và rút 4 lá bài từ chồng bài rút (`drawPile`). Sau đó, ông chọn 1 lá bài trên tay:
    - Nếu là lá bài Trang bị: Tự động mặc trực tiếp vào người (thay thế trang bị cũ nếu có, kích hoạt hiệu ứng tháo đồ tương ứng).
    - Nếu là lá bài thường: Bỏ vào chồng bài bỏ (`discardPile`).
  - Sau khi hoàn thành, lượt chơi kết thúc và chuyển lượt sang người tiếp theo.
- **🛡️ Chương Dương — Tháo Trang Bị Làm Hóa Giải (Equipment Negate):**
  - **Phản Ứng Kỹ (Reaction Skill):** Trong bất kỳ giai đoạn hỏi Hóa Giải (`ASK_NEGATE`), Trần Quang Khải có thể tháo 1 lá bài Trang bị trên người (vũ khí, giáp, ngựa) để sử dụng như một lá [Hóa Giải] (Vô Giải Khả Kích).
  - Trang bị tháo ra lập tức kích hoạt các sự kiện rời người (như Giáp Bạch Ngân hồi 1 HP).

---

## 35. Tướng Hệ Việt — Nguyễn Lữ (Nguyen Lu: Vanguard Assault)

- **⚡ Tiên Phong — Đột Phá Tiền Tuyến, Đánh Đổi Uy Lực (Vanguard Damage Strike):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Điều kiện tầm đánh:** Mục tiêu bắt buộc phải nằm trong tầm công kích hiệu dụng của Nguyễn Lữ (`RangeSystem.inSlashRange(player, target, alivePlayers)`). Nếu không trang bị vũ khí, tầm đánh mặc định là 1.
  - **Hình thức trả chi phí:**
    - **Mất 1 Máu (`costType: 'hp'`):** Nguyễn Lữ tự trừ 1 HP của bản thân để gây trực tiếp 1 điểm sát thương lên mục tiêu.
    - **Hy sinh Vũ khí (`costType: 'weapon'`):** Tháo lá bài vũ khí đang trang bị vào chồng bài bỏ (`discardPile`), kích hoạt sự kiện `ON_EQUIP_LOST` và gây trực tiếp 1 điểm sát thương lên mục tiêu mà bản thân không mất máu.

---

## 36. Tướng Hệ Sơn — Tuệ Tĩnh (Tue Tinh: Divine Medicine & Southern Herbs)

- **🌿 Nam Dược — Dược Liệu Nước Nam, Cứu Người Hấp Hối Ngoài Lượt (Out-of-Turn Red Card Peach):**
  - **Phản Ứng Kỹ (Reaction Skill):** Tích hợp vào quy trình cứu người hấp hối (`ASK_PEACH` / `respondPeach`).
  - **Ràng buộc nghiêm ngặt:** Chỉ có thể kích hoạt khi Tuệ Tĩnh ở **ngoài lượt của mình** (`state.currentTurnPlayerId !== rescuerId`).
  - **Cơ chế:** Tuệ Tĩnh có thể sử dụng bất kỳ lá bài nào có màu Đỏ (`card.color === 'red'` hoặc chất Cơ/Rô) trên tay làm lá [Đào] để hồi sinh 1 HP cho một người chơi đang hấp hối (bao gồm đồng minh hoặc chính mình khi hấp hối ngoài lượt).
  - Không cho phép biến đổi bài Đen hoặc kích hoạt khi đang ở trong chính lượt đi của mình (trong lượt của mình vẫn phải dùng đúng lá [Đào] thật sự).
- **✨ Diệu Dược — Tán Bài Khởi Tử, Cứu Trợ Toàn Quân (Discard 1 Card to Heal 1 HP):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Giới hạn lượt:** Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.dieu_duoc.usedThisTurn = true`).
  - **Chi phí & Mục tiêu:** Bỏ 1 lá bài bất kỳ trên tay để hồi 1 HP cho một người chơi còn sống bất kỳ chưa đầy Máu (`target.hp < target.maxHp`).
  - Chặn triệt để việc kích hoạt lên người chơi đã đầy máu để tránh lãng phí bài của người chơi.

---

## 37. Tướng Hệ Sơn — Đinh Bộ Lĩnh (Dinh Bo Linh: King's Magnanimity)

- **👑 Uy Chấn — Vạn Thắng Vương Ân Uy, Trừng Thưởng Kẻ Tấn Công (Red Slash Attacker Boon):**
  - **Tỏa Định Kỹ (Passive Lock Skill):** Kích hoạt tự động khi Đinh Bộ Lĩnh nhận sát thương (`ON_DAMAGED`).
  - **Điều kiện phát động:**
    - Đinh Bộ Lĩnh phải chính là mục tiêu nhận sát thương (`ownerId === targetId`).
    - Nguồn sát thương phải xuất phát từ một lá bài [Chém] (`type === 'slash'` hoặc `reason === 'slash'`).
    - Lá [Chém] đó phải có màu Đỏ (`card.color === 'red'` hoặc thuộc chất Cơ/Rô).
    - Không kích hoạt khi nhận sát thương từ Chém Đen hoặc các lá Cẩm nang (Hỏa Công, Quyết Đấu, Loạn Tiễn, Sấm Sét).
  - **Ân điển của bậc Đế Vương:**
    - Kẻ tấn công Đinh Bộ Lĩnh được lựa chọn nhận ân điển:
      - **Hồi 1 HP:** Nếu kẻ tấn công đang bị thương (`hp < maxHp`) và lựa chọn hồi phục.
      - **Rút 1 lá bài:** Nếu kẻ tấn công lựa chọn rút bài hoặc khi bản thân đã đầy máu.

---

## 38. Tướng Hệ Sơn — Nguyễn Bặc (Nguyen Bac: Arrow Rain & Faction Hegemony)

- **🏹 Bình Loạn — Gom Tên Đồng Chất, Bộc Phát Loạn Tiễn (Same Suit Pair to Arrow Rain):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Cơ chế chuyển hóa:** Nguyễn Bặc có thể bỏ **2 lá bài bất kỳ cùng chất** (`cardA.suit === cardB.suit`) trên tay để phát động một lá cẩm nang [Loạn Tiễn] ảo càn quét toàn bàn đấu.
  - Tất cả người chơi khác còn sống phải lần lượt đánh ra 1 lá [Né] hoặc phải nhận 1 điểm sát thương.
  - Hệ thống kiểm tra chặt chẽ tính tương đồng về chất bài, từ chối hành động nếu 2 lá bài chọn bỏ khác chất hoặc không đủ 2 lá bài.
- **🏛️ Khai Quốc — Chúa Công Kỹ Sơn Hệ, Mở Rộng Kho Lương (Lord Hand Size Expansion):**
  - **Chủ Công Kỹ (Lord Lock Skill):** Có hiệu lực xuyên suốt trận đấu và phát huy tác dụng tại Pha Bỏ bài (`PHASES.DISCARD`).
  - **Công thức tính giới hạn bài tay:**
    $$\text{MaxHand} = \text{HP Hiện Tại} + 2 \times (\text{Số lượng đồng minh hệ Sơn còn sống})$$
  - Giúp Nguyễn Bặc lưu trữ được một lượng tài nguyên khổng lồ trên tay mà không lo bị ép bỏ bài cuối lượt khi phe Sơn sở hữu nhiều đồng minh trên bàn cờ.

---

## 39. Tướng Hệ Sơn — Huyền Trân Công Chúa (Huyen Tran Cong Chua: Royal Marriage & Peacekeeping)

- **💃 Hòa Thân — Mỹ Nhân Kế Sách, Ép Tướng Quyết Đấu (Discard 1 Card to Force Male Duel):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Giới hạn lượt:** Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.hoa_than.usedThisTurn = true`).
  - **Cơ chế & Ràng buộc:**
    - Bỏ 1 lá bài bất kỳ trên tay để chỉ định **2 tướng Nam còn sống khác nhau** trên bàn cờ phải phát động Quyết Đấu với nhau.
    - Cả 2 mục tiêu bắt buộc phải là tướng Nam (`target.gender === 'male'`). Tuyệt đối từ chối nếu 1 trong 2 mục tiêu là nữ giới.
    - Sau khi kích hoạt, vòng phán xét Hóa Giải (`ASK_NEGATE`) được mở, sau đó người bị thách đấu phải đánh [Chém] (`ASK_SLASH_DUEL`) để đáp trả.
- **🌸 An Bang — Trừ Gian Giữ Nước, Thu Nhận Lộc Trời (End Phase Draw):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Kích hoạt tự động khi kết thúc lượt chơi của Huyền Trân tại Pha Kết thúc (`PHASES.END`).
  - **Hiệu ứng:** Huyền Trân Công Chúa tự động rút 1 lá bài từ chồng bài rút (`drawPile`), bổ sung binh lực dự trữ mà không bị tính vào giới hạn bài của lượt tiếp theo.
  - Chống nhảy ké: Chỉ kích hoạt khi chính Huyền Trân kết thúc lượt của mình (`ctx.ownerId === ctx.actorId`).

---

## 40. Tướng Hệ Sơn — Đinh Điền (Dinh Dien: Crime Punisher & Secret Counsel)

- **⚡ Phạt Tội — Né Tránh Phản Kích, Trừng Trị Gian Hùng (Dodge Counter Strike):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Kích hoạt khi Đinh Điền Né thành công một đòn Chém (`ON_DODGE_SUCCESS`).
  - **Hiệu ứng kép:**
    - **Trừng phạt kẻ tấn công:** Trừ thẳng 1 HP của kẻ ra đòn Chém (kích hoạt kiểm tra hấp hối nếu máu rơi về <= 0).
    - **Thu hồi quân nhu:** Nếu lựa chọn rút bài (`choice: 'draw'`), Đinh Điền rút 1 lá bài từ bộ bài rút thay vì trừ máu kẻ tấn công.
  - Chống nhảy ké: Tuyệt đối chỉ kích hoạt khi chính Đinh Điền là người Né thành công.
- **☯️ Quân Cơ — Đổi Màu Vận Mệnh, Bí Mật Can Thiệp (Judgement Intercept with Black Card):**
  - **Phản Ứng Kỹ (Reaction Skill):** Kích hoạt tại thời điểm phán xét cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn) trước khi kết quả có hiệu lực (`ASK_CHANGE_JUDGE`).
  - **Ràng buộc bài đánh ra:** Bắt buộc phải là **lá bài màu Đen** (`card.color === 'black'` hoặc chất Bích/Chuồn) từ bài trên tay.
  - Lá bài Đen đánh ra sẽ thay thế lá bài phán xét ban đầu, lá bài ban đầu bị đưa vào chồng bài bỏ.
- **👑 Định Quốc — Chúa Công Kỹ Sơn Hệ, Cố Vấn Binh Nhu (Lord Tribute: Dodge or Lightning):**
  - **Chủ Công Kỹ (Lord Skill):** Cho phép các đồng minh phe Sơn dâng tặng lá bài [Né] hoặc [Sấm Sét] cho Đinh Điền.
  - Hỗ trợ cả cơ chế đồng minh chủ động tặng bài trong lượt của mình và Đinh Điền kêu gọi qua Modal `ASK_DINH_QUOC`.
  - Nghiêm cấm tặng các lá bài không hợp lệ (như Chém, Đào) và cấm người chơi phe khác tham gia dâng bài.

---

## 41. Tướng Hệ Sơn — Nguyễn Xí (Nguyen Xi: Armor-Crushing Might)

- **💥 Phá Quân — Trảm Kích Uy Hùng, Ép Dùng Đôi Né (Double Dodge Slash Requirement):**
  - **Tỏa Định Kỹ (Passive Lock Skill):** Kích hoạt tự động khi Nguyễn Xí phát động đòn [Chém] tấn công bất kỳ mục tiêu nào (`ON_SLASH_TARGET`).
  - **Cơ chế uy dũng:**
    - Cưỡng bức mục tiêu phải sử dụng **đủ 2 lá bài [Né]** mới có thể hóa giải được đòn Chém (`requiredDodges = 2`).
    - Nếu mục tiêu chỉ đánh ra 1 lá [Né] rồi bỏ cuộc (không còn lá Né thứ 2 hoặc không muốn dùng tiếp), đòn Chém vẫn trúng đích và gây 1 điểm sát thương như bình thường.
  - Chống nhảy ké: Hiệu ứng chỉ áp dụng cho đòn Chém do chính Nguyễn Xí tung ra (`ownerId === actorId`), không làm ảnh hưởng đến đòn Chém của các người chơi khác trên bàn đấu.

---

## 42. Tướng Hệ Sơn — Lê Ngân (Le Ngan: Ultimate Loyalty & Desperate Vow)

- **🤥 Trung Dũng — Úp Bài Ảo Hóa, Vạn Biến Bất Ngờ (Universal Face-Down Card Play):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Giới hạn lượt:** Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.trung_dung.usedThisTurn = true`).
  - **Cơ chế:** Lê Ngân có thể úp 1 lá bài bất kỳ trên tay và tuyên bố sử dụng như bất kỳ lá bài nào (Chém, Đào, Rượu, hoặc Cẩm nang).
  - Lá bài được giải quyết đầy đủ hiệu ứng tương ứng (hồi 1 HP nếu dùng như Đào, tấn công mục tiêu mở frame ASK_DODGE nếu dùng như Chém).
- **🛡️ Hộ Giá — Tuyệt Đối Trung Quân, Tuyệt Mệnh Ngắt Mạch (Unquestionable & Low-HP Disable):**
  - **Tỏa Định Kỹ (Passive Lock Skill):**
    - **Cấm nghi ngờ:** Mọi lá bài do Trung Dũng đánh ra đều có hiệu lực tuyệt đối, người chơi khác không thể can thiệp nghi ngờ lật bài.
    - **Vô hiệu hóa nguy kịch:** Khi lượng máu của Lê Ngân rơi xuống còn **1 HP** (`hp <= 1`), lời thề hộ giá trỗi dậy khiến kỹ năng Trung Dũng bị phong ấn vô hiệu hóa hoàn toàn nhằm ngăn chặn việc lạm dụng bài úp trong trạng thái thập tử nhất sinh.

---

## 43. Tướng Hệ Sơn — Đô Đốc Bảo (Do Doc Bao: Fortress Breaker & Color Duel)

- **⚡ Phá Thành — Phán Xét Thu Binh, Đối Sắc Quyết Đấu (Draw Judgement & Opposite Color Duel):**
  - **Phản Ứng Kỹ & Chủ Động Kỹ (Two-Phase Skill):**
    - **Giai đoạn Rút bài (`PHASES.DRAW`):** Thay vì rút 2 lá bài thông thường, Đô Đốc Bảo có thể mở phán xét từ đỉnh bộ bài rút (`ASK_PHA_THANH`), thu trực tiếp lá bài phán xét đó vào tay và bỏ qua việc rút 2 lá bài thông thường (`skipDrawPhase = true`).
    - **Giai đoạn Ra bài (`PHASES.ACTION`):** Đô Đốc Bảo có thể sử dụng bất kỳ lá bài nào có **màu đối lập** với lá phán xét thu được (ví dụ phán xét ra bài Đỏ thì dùng bài Đen, phán xét ra bài Đen thì dùng bài Đỏ) để phát động một trận [Quyết Đấu] ảo nhắm vào một mục tiêu chỉ định.
  - Chặn đứng mọi hành vi sử dụng bài cùng màu để Quyết Đấu nếu không thỏa mãn điều kiện đối sắc của Phá Thành.

---

## 44. Tướng Hệ Hà — Ngô Quyền (Ngo Quyen: Bach Dang Tide & Rear Support)

- **🌊 Bạch Đằng — Thủy Triều Rút Cạn, Đổi Bài Thần Tốc (Hand Cycling with Empty Bonus):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Giới hạn lượt:** Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.bach_dang.usedThisTurn = true`).
  - **Cơ chế & Thưởng rút:**
    - Ngô Quyền có thể bỏ $X$ lá bài trên tay để rút lại đúng $X$ lá bài mới từ bộ bài rút.
    - **Đặc ân Bạch Đằng:** Nếu Ngô Quyền quyết định bỏ toàn bộ bài trên tay ($X = \text{hand.length}$), ông được nhận thêm **+1 lá bài thưởng** (tổng rút $X + 1$ lá bài mới).
    - Ngăn chặn hoàn toàn việc kích hoạt nếu không còn bài trên tay hoặc đã kích hoạt trong lượt hiện tại.
- **🛡️ Hậu Viện — Chúa Công Kỹ Hà Hệ, Tương Trợ Quân Vương (Lord Peach Donation Boon):**
  - **Chủ Công Kỹ (Lord Reaction Skill):** Kích hoạt tự động khi một đồng minh thuộc phe Hà sử dụng lá [Đào] lên bản thân (`ASK_HAU_VIEN`).
  - **Cơ chế tương trợ:**
    - Nếu Chúa Công Ngô Quyền đang bị thương (`hp < maxHp`), đồng minh có quyền lựa chọn nhường điểm hồi máu của lá Đào cho Ngô Quyền.
    - Khi chấp thuận, Ngô Quyền hồi 1 HP và đồng minh nhường Đào lập tức được rút thưởng 1 lá bài từ bộ bài rút.
    - Nếu đồng minh từ chối hoặc Ngô Quyền đã đầy máu, quả Đào giữ nguyên tác dụng hồi phục cho chính người sử dụng.

---

## 45. Tướng Hệ Hà — Yết Kiêu (Yet Kieu: Deep Dive Resource Gatherer)

- **🌊 Lặn Sâu — Thủy Chiến Đoạt Binh, Đổi Máu Rút Bài (HP Sacrifice for Hand Cards):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Cơ chế & Tiêu hao:**
    - Yết Kiêu chủ động mất 1 điểm Sinh lực (`owner.hp -= 1`) để lập tức rút 2 lá bài mới từ đỉnh bộ bài rút.
    - **Không giới hạn lượt:** Có thể kích hoạt nhiều lần liên tiếp trong cùng một lượt miễn là lượng máu hiện tại lớn hơn 1 (`hp > 1`).
    - **Chốt an toàn tự sát:** Tuyệt đối chặn không cho kích hoạt khi Yết Kiêu chỉ còn 1 HP (`hp <= 1`) để bảo toàn sinh mạng cho người chơi.

---

## 46. Tướng Hệ Hà — Nguyễn Trãi (Nguyen Trai: Binh Ngo Victory & Psychological Warfare)

- **📜 Bình Ngô — Tuyên Cáo Hùng Văn, Tiếp Lương Nở Rộ (Draw Phase Extra Card):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Kích hoạt tại Pha Rút bài (`PHASES.DRAW`).
  - **Hiệu ứng:** Nguyễn Trãi tự động kích hoạt Bình Ngô, được rút thêm +1 lá bài từ bộ bài rút, nâng tổng số quân lương rút trong lượt lên **3 lá bài** (`drawCardCount = 3`).
- **🔮 Tâm Công — Đánh Vào Lòng Địch, Phán Xét Trừng Phạt (Suit Guessing Strike):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Giới hạn lượt:** Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.tam_cong.usedThisTurn = true`).
  - **Cơ chế đối đầu:**
    - Nguyễn Trãi chỉ định 1 tướng khác còn sống tham gia đoán chất bài qua modal `ASK_SUIT`.
    - Mục tiêu lựa chọn 1 trong 4 chất bài (Cơ, Rô, Bích, Tép/Chuồn).
    - Mục tiêu thu lấy ngẫu nhiên 1 lá bài từ tay Nguyễn Trãi và lật mở công khai.
    - **Đoán sai:** Mục tiêu lập tức phải chịu **1 điểm sát thương** do Nguyễn Trãi gây ra (`tam_cong`) và vẫn giữ lá bài thu được.
    - **Đoán đúng:** Mục tiêu an toàn nhận lá bài mà không chịu bất kỳ sát thương nào.
  - Ngăn chặn kích hoạt nếu Nguyễn Trãi không còn bài trên tay hoặc đã sử dụng Tâm Công trong lượt.---

## 47. Tướng Hệ Hà — Tô Hiến Thành (To Hien Thanh: Righteous Regent)

- **⚖️ Nhiếp Chính — Giữ Trọng Trách Nước, Khắc Chế Bỏ Bài (Slashless Hand Retain):**
  - **Tỏa Định Kỹ (Passive Lock Skill):** Phát huy tác dụng tại thời điểm kết thúc Pha Ra bài (`PHASES.ACTION`) chuẩn bị bước vào Pha Bỏ bài (`PHASES.DISCARD`).
  - **Điều kiện miễn trừ:**
    - Trong lượt hiện tại, Tô Hiến Thành **không sử dụng bất kỳ lá bài [Chém] nào** (`turnStats.slashCount === 0`).
  - **Hiệu ứng đặc quyền:**
    - Hoàn toàn **bỏ qua Pha Bỏ bài** (`PHASES.DISCARD`), không tạo frame `ASK_DISCARD` và bảo toàn 100% số lá bài hiện có trên tay dù số lượng bài vượt quá chỉ số Máu hiện tại (`hand.length > hp`).
    - Lượt chơi lập tức chuyển sang Pha Kết thúc (`PHASES.END`) và luân chuyển sang người chơi kế tiếp.
    - `GameInvariants.assertDiscardLimit` miễn trừ kiểm tra giới hạn bài tay cho Tô Hiến Thành nếu thỏa mãn điều kiện không đánh Chém.
---

## 48. Tướng Hệ Hà — Nguyên Phi Ỷ Lan (Nguyen Phi Y Lan: Regent & Pure Heart)

- **⚖️ Thính Chính — Nhiếp Chính Lâm Triều, Đen Hóa Phòng Thủ (Black Card as Dodge):**
  - **Phản Ứng Kỹ (Reaction Skill):** Tích hợp vào quy trình đối phó đòn Chém (`ASK_DODGE` / `respondDodge`) và các sát thương cẩm nang yêu cầu lá [Né] (như [Loạn Tiễn]).
  - **Cơ chế chuyển hóa:**
    - Nguyên Phi Ỷ Lan có thể đánh ra bất kỳ **lá bài màu Đen** nào trên tay (`color === 'black'` hoặc chất Bích ♠ / Chuồn ♣) để tính như một lá [Né] hợp lệ.
    - Lá bài Đen đánh ra sẽ được đưa vào chồng bài bỏ (`discardPile`) và đòn tấn công được hóa giải thành công.
    - Tuyệt đối từ chối nếu đánh ra lá bài Đỏ không phải là lá [Né] gốc của trò chơi.
- **🧘 Phật Tâm — Hướng Thiện Tích Đức, Phán Xét Thu Binh (Continuous Black Card Judgement):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Kích hoạt tự động tại Pha Bắt đầu (`PHASES.BEGIN`) thông qua `dispatchTrigger('BEGIN_PHASE')`.
  - **Cơ chế phán xét chuỗi liên tiếp:**
    - Nguyên Phi Ỷ Lan tiến hành rút phán xét từ đỉnh bộ bài rút (`drawPile`).
    - **Nếu là bài Đen (`color === 'black'`):** Tích lũy lá bài và tiếp tục mở phán xét lá bài tiếp theo.
    - **Nếu là bài Đỏ (`color === 'red'`):** Lá bài Đỏ bị đưa vào chồng bài bỏ (`discardPile`) và chuỗi phán xét kết thúc.
---

## 49. Tướng Hệ Hà — Hồ Xuân Hương (Ho Xuan Huong: Poetic Healing & Equipment Resilience)

- **📜 Duyên Thơ — Thi Hứng Nối Duyên, Hồi Phục Song Phương (Discard 2 Hand Cards to Heal Self & Male Hero):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Giới hạn lượt:** Mỗi lượt chỉ được sử dụng đúng 1 lần (`skillUsage.duyen_tho.usedThisTurn = true`).
  - **Chi phí & Ràng buộc:**
    - Hồ Xuân Hương bỏ **2 lá bài bất kỳ** trên tay vào chồng bài bỏ (`discardPile`).
    - Chỉ định 1 tướng Nam còn sống đang bị thương (`target.gender === 'male' && target.hp < target.maxHp`).
  - **Hiệu ứng hồi phục:**
    - Hồ Xuân Hương tự hồi phục **1 điểm Sinh lực** (nếu đang bị thương).
    - Tướng Nam được chọn đồng thời hồi phục **1 điểm Sinh lực**.
    - Ngăn chặn hoàn toàn việc tái kích hoạt trong cùng một lượt hoặc kích hoạt khi không có đủ 2 lá bài trên tay.
- **🌺 Xuân Hương — Hồng Nhan Giữ Khí, Mất Binh Bổ Viện (Lost Equipment Draw 2 Cards):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Tự động phát động khi Hồ Xuân Hương mất 1 lá bài ở khu Trang bị (`ON_EQUIP_LOST`).
  - **Điều kiện phát động:** Chỉ kích hoạt khi chính Hồ Xuân Hương là chủ thể bị tháo/mất trang bị (`ctx.ownerId === ctx.targetId`), không nhảy ké khi người chơi khác mất trang bị.
---

## 50. Tướng Hệ Hà — Ngọc Hân Công Chúa (Ngoc Han Cong Chua: Benevolent Consort & National Beauty)

- **🌺 Hiền Hậu — Đức Độ Nương Tử, Chuyển Họa Vi Phúc (Heart Card Damage Negate & Retribution):**
  - **Phản Ứng Kỹ (Reaction Skill):** Kích hoạt khi Ngọc Hân chuẩn bị nhận sát thương (`CombatRules.applyDamage`).
  - **Điều kiện phát động:** Ngọc Hân có ít nhất 1 lá bài Cơ ♥ (hoặc lá bài Bích ♠ chuyển hóa nhờ Quốc Sắc) trên tay.
  - **Cơ chế hóa giải & Phản kích:**
    - Ngọc Hân bỏ 1 lá bài Cơ/Bích trên tay để **ngăn chặn toàn bộ sát thương** đang nhắm vào bản thân.
    - Chỉ định 1 tướng khác còn sống trên bàn cờ và chọn 1 trong 2 hiệu ứng trừng phạt:
      - **Lựa chọn 1:** Tướng đó nhận 1 điểm sát thương từ Ngọc Hân, sau đó được rút $X$ lá bài mới từ bộ bài rút ($X = \text{Máu đã mất} = \text{MaxHP} - \text{HP}$, tối đa 5 lá).
      - **Lựa chọn 2:** Tướng đó mất thẳng 1 điểm Sinh lực và thu lấy chính lá bài Ngọc Hân vừa bỏ về tay mình.
    - Nếu Ngọc Hân từ chối kích hoạt, sát thương ban đầu được áp dụng như bình thường.
- **👑 Quốc Sắc — Nghiêng Nước Nghiêng Thành, Hắc Biến Vi Hồng (Spade As Heart Lock Skill):**
  - **Tỏa Định Kỹ (Passive Lock Skill):** Có hiệu lực vĩnh viễn xuyên suốt ván đấu.
  - **Cơ chế biến đổi:** Mọi lá bài chất Bích (Spade ♠) trên tay và thuộc quyền sở hữu của Ngọc Hân đều được hệ thống tính như chất Cơ (Heart ♥) và màu Đỏ (`red`).
---

## 51. Tướng Hệ Hà — Dã Tượng (Da Tuong: Elephant Raid Master)

- **⚡ Kỳ Tập — Đột Kích Thần Tốc, Đen Hóa Tước Bài (Black Card as Dismantle):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Không giới hạn lượt:** Có thể sử dụng liên tục nhiều lần trong cùng một lượt miễn là còn bài Đen trên tay.
  - **Cơ chế chuyển hóa:**
    - Dã Tượng có thể sử dụng bất kỳ **lá bài màu Đen** nào trên tay (`color === 'black'` hoặc chất Bích ♠ / Chuồn ♣) như một lá cẩm nang [Tước Bài].
    - Chỉ định 1 mục tiêu bất kỳ còn sống có bài (trên tay, trang bị hoặc khu phán xét).
    - Mở vòng hỏi Hóa Giải (`ASK_NEGATE`), nếu không bị Hóa Giải thì 1 lá bài của mục tiêu bị tước và chuyển vào chồng bài bỏ.
  ---

## 52. Tướng Hệ Hà — Nguyễn Chích (Nguyen Chich: Nghe An Strategist)

- **🛡️ Nghệ An Kế — Đất Hiểm Dễ Thủ, Miễn Nhiễm Đoạt Binh (Steal & Chaos Immunity):**
  - **Tỏa Định Kỹ (Passive Lock Skill):** Có hiệu lực vĩnh viễn xuyên suốt ván đấu.
  - **Cơ chế miễn trừ đặc quyền:**
    - Nguyễn Chích tuyệt đối **không thể trở thành mục tiêu** của lá cẩm nang [Cướp Bài] (`cuop_bai`) và cẩm nang trì hoãn [Hỗn Loạn] (`hon_loan`).
    - Hệ thống định vị mục tiêu (`TargetResolverV4`) tự động lọc và loại trừ Nguyễn Chích khỏi danh sách đích nhắm khả dĩ.
    - Ngăn chặn triệt để hành vi cố ý phát động cẩm nang nhắm vào Nguyễn Chích qua cơ chế kiểm tra `TrickRules`.
- **📜 Hiến Kế — Tận Lực Hiến Kế, Hết Bài Bổ Viện (Empty Hand Draw 1 Card):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Tự động phát động ngay khi Nguyễn Chích mất đi **lá bài cuối cùng trên tay** (`hand.length === 0`).
  - **Phạm vi áp dụng:** Áp dụng cho mọi hình thức mất bài: tự bỏ bài, đánh ra lá bài cuối cùng hoặc bị đối phương tước bài.
---

## 53. Tướng Hệ Hà — Trần Nhật Duật (Tran Nhat Duat: Master Linguist & Peace Envoy)

- **📜 Thông Ngôn — Bác Học Đa Ngôn, Thu Bài Phán Xét (Judgement Card Retrieval):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Tự động phát động sau khi lá bài phán xét của Trần Nhật Duật có hiệu lực (`ON_JUDGED`).
  - **Cơ chế thu binh:**
    - Trần Nhật Duật tự động thu hồi chính **lá bài phán xét** (`judgeCard`) vừa có hiệu lực vào tay mình làm quân lương dự trữ.
    - Loại bỏ ngay lập tức lá bài đó khỏi chồng bài bỏ (`discardPile`).
    - Chống nhảy ké: Tuyệt đối chỉ kích hoạt khi chính Trần Nhật Duật là đối tượng chịu phán xét (`ctx.ownerId === ctx.targetId`).
- **🕊️ Hòa Nghị — Sứ Giả Hòa Hảo, Tiếp Lương Chia Binh (Damage Taken Draw 2 & Distribute):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Kích hoạt ngay khi Trần Nhật Duật nhận 1 điểm sát thương (`ON_DAMAGED`).
  - **Cơ chế tiếp tế:**
    - Lập tức rút **2 lá bài mới** từ đỉnh bộ bài rút (`drawPile`) và mở modal tương tác `ASK_HOA_NGHI`.
    - **Phân phối:** Trần Nhật Duật có toàn quyền quyết định chuyển giao bất kỳ lá bài nào vừa rút cho các tướng đồng minh hoặc tướng khác trên bàn cờ.
  ---

## 54. Tướng Hệ Hà — Trần Khánh Dư (Tran Khanh Du: Van Don Naval Commander)

- **🌊 Vân Đồn — Hải Chiến Đọ Điểm, Trảm Kích Vô Song (Point Duel for Extra Slash & Range):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Giới hạn lượt:** Mỗi lượt chỉ được sử dụng đúng 1 lần (`temporaryFlags.vanDonUsed = true`).
  - **Cơ chế đấu điểm (`ASK_VAN_DON`):**
    - Trần Khánh Dư chỉ định 1 tướng khác còn sống có bài trên tay để bước vào đấu điểm.
    - Cả 2 cùng bí mật rút 1 lá bài trên tay so sánh độ lớn giá trị số ($2 < 3 < \dots < K < A$).
    - **Nếu Thắng ($Rank_{TKD} > Rank_{target}$):**
      - Kích hoạt cờ `vanDonWin = true`.
      - **Tăng giới hạn Chém:** Được phép đánh thêm 1 lá [Chém] trong lượt (nâng tổng số lần Chém lên tối đa 2 lần, được bảo vệ qua `GameInvariants.assertSlashLimit`).
      - **Vô hạn tầm đánh:** Toàn bộ các đòn Chém trong lượt này bỏ qua mọi giới hạn khoảng cách và cự ly phòng thủ của kẻ địch (`isInfiniteRange = true`).
---

## 55. Tướng Hệ Hà — Mạc Đĩnh Chi (Mac Dinh Chi: Luong Quoc Trang Nguyen)

- **📜 Đối Sứ — Đĩnh Đạc Đi Sứ, Phản Kích Đoạt Binh (Steal Card from Attacker):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Kích hoạt ngay sau khi Mạc Đĩnh Chi nhận sát thương (`ON_DAMAGED`).
  - **Điều kiện phát động:** Nguồn sát thương (kẻ gây sát thương) là một người chơi còn sống và còn ít nhất 1 lá bài trên tay (`actor.hand.length > 0`).
  - **Hiệu ứng:** Mạc Đĩnh Chi được phép rút trực tiếp **1 lá bài từ tay kẻ tấn công** đưa về tay mình (`ASK_DOI_SU`).
  - Chống nhảy ké: Tuyệt đối chỉ kích hoạt khi chính Mạc Đĩnh Chi là người chịu thiệt hại (`ctx.ownerId === ctx.targetId`).
- **☯️ Ứng Biến — Lưỡng Quốc Trạng Nguyên, Vạn Biến Phán Xét (Universal Judgement Intercept):**
  - **Phản Ứng Kỹ (Reaction Intercept):** Kích hoạt trong Pha Phán xét (`PHASES.JUDGE`) của bất kỳ người chơi nào khi có cẩm nang trì hoãn (Sấm Sét, Hỗn Loạn) chuẩn bị có hiệu lực (`ASK_CHANGE_JUDGE`).
  - **Cơ chế xoay chuyển vận mệnh:**
    - Mạc Đĩnh Chi có thể đánh ra **bất kỳ lá bài nào** trên tay (không giới hạn màu sắc hay chất bài) để thay thế lá bài phán xét ban đầu.
    - Lá bài phán xét ban đầu bị hủy vào chồng bài bỏ (`discardPile`), lá bài Mạc Đĩnh Chi đánh ra trở thành kết quả phán xét chính thức.
---

## 56. Tướng Hệ Hà — Chu Văn An (Chu Van An: Righteous Teacher & Petitions)

- **📜 Thất Trảm Sớ — Dâng Sớ Trảm Nịnh, Phán Xét Trừng Phạt (Damaged Heart Judgement Retribution):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Kích hoạt ngay sau khi Chu Văn An nhận sát thương (`ON_DAMAGED`).
  - **Cơ chế phán xét công lý:**
    - Chu Văn An tiến hành lật 1 lá bài phán xét từ đỉnh bộ bài rút (`drawPile`).
    - **Nếu là chất Cơ (Heart ♥):** Khí tiết thanh cao, kẻ tấn công may mắn thoát nạn, không phải chịu bất kỳ sự trừng phạt nào.
    - **Nếu KHÔNG phải chất Cơ (Bích ♠, Chuồn ♣, Rô ♦):** Lời sớ linh ứng, kẻ gây sát thương lập tức bị đưa vào thế trừng phạt qua modal `ASK_THAT_TRAM_SO_PUNISH` và bắt buộc chọn 1 trong 2:
      - **Lựa chọn 1 (Bỏ bài):** Bỏ ngay **2 lá bài** trên tay vào chồng bài bỏ (`discardPile`).
      - **Lựa chọn 2 (Chịu sát thương):** Nhận **1 điểm sát thương** trừng phạt do chính Chu Văn An gây ra.
---

## 57. Tướng Hệ Hà — Nguyễn Địa Lô (Nguyen Dia Lo: Loyal Helmsman & Honest Remonstrance)

- **🛡️ Hộ Chủ — Trung Quân Ái Quốc, Bài Trung Hồi Sinh (Loyal Card Dying Revival & Hand Expansion):**
  - **Tỏa Định Kỹ (Passive Lock Skill):** Kích hoạt tự động ngay khi Nguyễn Địa Lô rơi vào trạng thái Hấp hối (`ON_DYING`).
  - **Cơ chế lật bài "Trung":**
    - Nguyễn Địa Lô tự động lật 1 lá bài từ đỉnh bộ bài rút (`drawPile`).
    - **Nếu điểm số (rank) khác biệt:** Điểm số lá bài mới không trùng với bất kỳ lá bài "Trung" nào đã có trước đó trên tướng. Lá bài được đặt lên tướng làm bài "Trung", Nguyễn Địa Lô lập tức hồi phục lên **1 điểm Sinh lực** (`hp = 1`) và thoát khỏi trạng thái hấp hối mà không cần sự trợ giúp từ bên ngoài.
    - **Nếu trùng điểm số:** Lá bài bị đưa vào chồng bài bỏ (`discardPile`), kỹ năng thất bại và Nguyễn Địa Lô phải bước vào vòng gọi Đào cứu viện (`ASK_PEACH`).
  - **Đặc quyền mở rộng kho lương:** Khi trên người có các lá bài "Trung", giới hạn bài tay tối đa tại Pha Bỏ bài được nới rộng bằng chính **số lượng lá bài "Trung"** hiện có ($\text{MaxHand} = \max(\text{HP}, \text{trungCards.length})$).
- **🕊️ Can Gián — Ngay Thẳng Can Ngăn, Hy Sinh Tiếp Binh (HP Sacrifice for Ally Draw 2 Cards):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Ràng buộc sinh mệnh:** Bắt buộc lượng Sinh lực hiện tại phải lớn hơn 1 (`hp > 1`).
  - **Hiệu ứng:** Nguyễn Địa Lô chủ động mất **1 điểm Sinh lực** (`hp -= 1`) để giúp 1 tướng mục tiêu còn sống lập tức rút **2 lá bài mới** từ đỉnh bộ bài rút.

---

## 58. Tướng Hệ Hà — Công chúa An Tư (Cong Chua An Tu: Noble Sacrifice & Chaos Beauty)

- **🌺 Hòa Thân — Mỹ Nhân Rô Đỏ, Hỗn Loạn Phán Xét (Diamond Cards to Delayed Chaos):**
  - **Chủ Động Kỹ (Active Skill):** Kích hoạt trong Pha Ra bài (`PHASES.ACTION`).
  - **Cơ chế chuyển hóa cẩm nang:**
    - Công chúa An Tư có thể sử dụng bất kỳ lá bài nào có chất **Rô ♦** (`suit === 'diamond'` hoặc `suit === '♦'`) trên tay như lá cẩm nang trì hoãn **[Hỗn Loạn]** (Lạc Bất Tư Thục).
    - Lá bài chuyển hóa được đặt trực tiếp vào khu phán xét (`judgementArea`) của mục tiêu chỉ định.
  - **Bảo toàn số lượng lá bài (Card Conservation):** Tuyệt đối không đưa lá bài vào chồng bài bỏ (`discardPile`) khi phát động; lá bài chỉ được đưa vào `discardPile` sau khi hoàn tất giai đoạn phán xét ở lượt của người bị dính Hỗn Loạn, loại trừ triệt để nguy cơ nhân đôi thẻ bài.
  - **Tương thích giao diện & API:** Hỗ trợ kích hoạt qua cả `ACTION_PLAY_CARD` (gắn cờ `asChaos` hoặc `virtualCardName: 'Hỗn Loạn'`) và `ACTION_USE_SKILL` (`skillId: 'hoa_than_an_tu'`).
- **🕊️ Xả Thân — Vì Nước Xả Thân, Chuyển Hướng Đao Binh (Discard 1 Card to Redirect Slash Attack):**
  - **Phản Ứng Kỹ (Reaction Trigger):** Kích hoạt ngay khi Công chúa An Tư trở thành mục tiêu của một lá [Chém] (`ASK_XA_THAN`), chen ngang trước giai đoạn yêu cầu [Né] (`ASK_DODGE`).
  - **Điều kiện phát động:**
    - An Tư còn ít nhất 1 lá bài trên người (bài trên tay hoặc trang bị trên người).
    - Có ít nhất 1 người chơi khác còn sống (ngoài kẻ tấn công và An Tư) nằm trong phạm vi công kích của An Tư (`RangeSystem.inSlashRange(target, p)`).
  - **Cơ chế chuyển hướng hiểm nguy:**
    - An Tư bỏ **1 lá bài** (từ tay hoặc tháo trang bị) và chỉ định mục tiêu chuyển hướng hợp lệ (`redirectedTargetId`).
    - Nếu lá bài bỏ là trang bị (ví dụ: [Bạch Ngân]), lập tức kích hoạt hiệu ứng mất trang bị và hồi 1 HP cho An Tư.
    - Cú [Chém] lập tức được chuyển dời sang mục tiêu mới, mở frame `ASK_DODGE` cho mục tiêu mới với đầy đủ thuộc tính ban đầu (sát thương, số Né yêu cầu).
  - **Lựa chọn bỏ qua:** Nếu An Tư từ chối chuyển hướng, đòn [Chém] tiếp tục nhắm vào An Tư và mở frame `ASK_DODGE` cho An Tư như bình thường.

---

## 59. Kiến Trúc Ứng Dụng Di Động & Giao Diện Ngang (Mobile Landscape & Capacitor Hybrid Shell)

- **📱 Giao Diện Ngang Chuẩn Di Động (Mobile Landscape Layout):**
  - **Khái niệm:** Bố cục đồ họa được thiết kế tối ưu riêng biệt cho khung nhìn xoay ngang của thiết bị di động (chiều cao từ 360px đến 500px, chiều rộng từ 700px đến 950px).
  - **Quy tắc không gian (Zero Vertical Scroll):** Mọi thành phần quan trọng trong các màn hình tương tác (như 5 lá tướng trong màn hình Draft và toàn bộ bàn đấu in-game) phải nằm gọn trong một khung nhìn duy nhất, tuyệt đối không đòi hỏi người chơi phải cuộn trang theo chiều dọc để chạm các nút hành động cốt lõi.
  - **Vùng an toàn (Safe Area Inset):** Khoảng đệm vật lý tự động thích ứng với tai thỏ (Notch), nốt ruồi camera và thanh điều hướng ảo trên các dòng điện thoại thông minh viền mỏng (`env(safe-area-inset-*)`).
- **⚡ Vỏ Bọc Ứng Dụng Lai Capacitor (Capacitor App Shell):**
  - **Khái niệm:** Lớp bao bọc Native Wrapper dựa trên Capacitor để đóng gói toàn bộ gói mã nguồn client web thành ứng dụng Android (`.apk` / `.aab`) và iOS (`.ipa`).
  - **Khóa xoay ngang (Landscape Orientation Lock):** Thuộc tính cấu hình hệ thống buộc ứng dụng luôn tự động khởi động và hiển thị ở hướng ngang, ngăn chặn việc xoay dọc làm gãy vỡ tỷ lệ bàn đấu.

---

## 60. Kiến Trúc Điều Phối API & Bất Biến Chống Treo Game (API Throttle & Reaction Non-Blocking Invariant)

- **🚫 Bất Biến Miễn Nhiễm Phản Hồi (Reaction Non-Blocking Invariant):**
  - **Khái niệm:** Trong kiến trúc Engine V4 hướng sự kiện, mọi cuộc gọi `gameAPI.respond()` đóng vai trò là câu trả lời bắt buộc cho trạng thái chờ phản hồi (`waitingForResponse`) của máy trạng thái (`StateMachine`).
  - **Bất biến sinh mệnh:** Hàm `respond()` tuyệt đối **không bao giờ được phép bị chặn hoặc trì hoãn** bởi các cơ chế chống click tặc / throttle client. Nếu một phản hồi bị rơi rụng (dropped), máy trạng thái sẽ chờ đợi vô tận dẫn đến tình trạng đóng băng hoàn toàn bàn đấu (deadlock).
- **⏱️ Cơ Chế Xả Throttle Đồng Bộ Trạng Thái (State-Driven Throttle Release):**
  - **Khái niệm:** Cờ chống spam nút (`isSubmittingGlobal`) được tự động giải phóng ngay tại thời điểm Engine hoàn tất xử lý và phát sóng trạng thái mới (`dispatcher.subscribe`), thay vì chỉ dựa vào đồng hồ đếm ngược tĩnh (timer timeout).
  - **Lợi ích:** Cho phép người chơi thực hiện các chuỗi combo hợp lệ (như xả nhiều lá Chém liên tiếp khi có [Liên Nỏ]) mượt mà với độ trễ cực thấp (< 50ms) mà vẫn đảm bảo ngăn chặn 100% tình trạng click đúp ngoài ý muốn.

---

## 61. Kiểm Định Tích Hợp Đa Tầng (Multi-Tier Simulation & Adapter Stress Testing)

- **🔬 Giả Lập Tầng Cốt Lõi (Core Engine Simulation):**
  - **Khái niệm:** Môi trường chạy không đầu (Headless) chỉ kiểm thử logic nội bộ của `StateMachine`, `CombatRules`, `TrickRules`, và `HeroRegistry`.
  - **Đặc điểm:** Tốc độ thực thi cực nhanh (hàng ngàn trận trong vài giây), kiểm tra tính toàn vẹn của dữ liệu và bài toán bảo toàn thẻ, nhưng hoàn toàn bỏ qua lớp điều phối API và giao diện tương tác.
- **🛡️ Giả Lập Tầng Ứng Dụng (Application-Layer Stress Testing):**
  - **Khái niệm:** Môi trường chạy bao phủ toàn bộ vòng đời tương tác từ Client tới Engine, bao gồm `DispatcherV4`, `GameAPIV4`, lớp bọc kiểm duyệt Throttle (`Proxy`), chu trình phản hồi `BotRunnerV4`, và hành vi auto-skip bất đồng bộ của React Components (`ModalContainer.jsx`).
  - **Lợi ích:** Phát hiện chính xác các lỗi biên tích hợp (Integration Boundary Defects), deadlock do cơ chế chống spam client chặn nhầm phản hồi Engine, và các trường hợp ngoại lệ phát sinh từ độ trễ mạng/máy khách.

---

## 62. Bộ Đếm Canh Giác Tự Động Phía Máy Khách (Client-Side Watchdog Timer & Auto-Skip Guard)

- **⏳ Bộ Đếm Canh Giác Máy Khách (Client-Side Watchdog Timer):**
  - **Khái niệm:** Cơ chế đồng hồ giám sát độc lập chạy trên giao diện React (`ModalContainer.jsx`), tự động kích hoạt mỗi khi có một yêu cầu phản hồi tương tác (`waitingForResponse`) hướng đến người chơi chính (`me.id`).
  - **Thời lượng:** 15 giây đếm ngược cho mỗi yêu cầu tương tác. Tự động reset bộ đếm khi xuất hiện yêu cầu mới hoặc người chơi chuyển lượt.
  - **Bảo hiểm giải phóng bế tắc:** Khi hết thời gian đếm ngược mà người chơi chưa đưa ra phản hồi (do AFK, sự cố thiết bị, hoặc lỗi giao diện không hiển thị), Watchdog tự động phát lệnh phản hồi an toàn (`canceled: true`, `doReact: false`, `_isAuto: true`). Nhờ đó, ngăn xếp ưu tiên (`priorityStack`) của Engine được giải phóng ngay lập tức, ván đấu tiếp diễn bình thường và triệt tiêu 100% nguy cơ treo game (Deadlock).
- **🛑 Phù Hiệu Đếm Ngược Trực Quan (Visual Countdown Pill):**
  - **Khái niệm:** Huy hiệu thông báo thời gian phản hồi cố định (`top: 20px, right: 20px`, `zIndex: 99999`) hiển thị số giây còn lại (`⏳ {timeLeft}s`) trong suốt quá trình một Modal tương tác đang mở.
  - **Cảnh báo động thái:** Khi thời gian còn $\le 5$ giây, huy hiệu tự động kích hoạt trạng thái cảnh báo khẩn cấp: viền đỏ rực (`#ef4444`), phát sáng nhẹ và nền đỏ mờ, giúp người chơi nhanh chóng nhận biết và kịp thời ra quyết định.

---

## 63. Kiến Trúc Giao Diện Di Động Cockpit (Mobile Battlefield Cockpit Architecture)

- **🕹️ Cockpit Layout (Bố Cục Cockpit Di Động):**
  - **Khái niệm:** Hệ thống phân bổ giao diện bàn chơi tối ưu cho màn hình cảm ứng di động xoay ngang (Landscape), loại bỏ hoàn toàn thanh trạng thái chia đôi màn hình ở giữa và phân rã thành 4 phân vùng công thái học: `Hero Dock` (trái dưới), `Hand Fan` (giữa dưới), `Action Hub` (phải dưới), và `Arena Field` (nửa trên).
- **🛡️ Hero Dock (Bến Tướng & Khí Giới):**
  - **Khái niệm:** Phân vùng góc dưới bên trái neo giữ 2 thẻ Tướng (Chính Tướng & Phó Tướng), thanh máu kết hợp (HP), huy hiệu Phe phái và 4 ô trang bị (Vũ khí, Giáp, Ngựa công, Ngựa thủ). Giúp người chơi theo dõi toàn bộ tài nguyên phòng thủ của mình trong một tầm mắt duy nhất mà không chiếm diện tích trung tâm.
- **🃏 Hand Fan (Khay Bài Cung Xòe Tự Thích Ứng):**
  - **Khái niệm:** Khay bài trên tay neo ở mép đáy chính giữa, tự động co giãn kích thước thẻ bài và kích thước phông chữ (Fluid Typography) theo số lượng bài hiện có. Áp dụng hiệu ứng nhô cao (Card Elevation) khi chạm chọn và loại bỏ hoàn toàn hiện tượng tràn khung hoặc cắt cụt tên thẻ bài (ví dụ: `Ngựa Chiến (-1)`).
- **⚡ Action Hub (Trung Tâm Kích Hoạt Ngón Cái):**
  - **Khái niệm:** Cụm điều khiển tập trung ở góc dưới bên phải, gồm nút kích hoạt Kỹ Năng Tướng, nút Lật Mặt Tướng và nút Kết Thúc Lượt (`⏭️`). Đặt tại vị trí công thái học thuận lợi nhất cho ngón cái tay phải của game thủ mobile.
- **🏟️ Arena Field (Chiến Trường Trung Tâm Vòng Cung):**
  - **Khái niệm:** Không gian bàn đấu chính ở nửa trên màn hình. Các đối thủ (Bot / Người chơi khác) được bố trí theo hình cánh cung cân đối quanh bàn tiệc, kèm thanh HP trực quan và số bài trên tay. Khu vực giữa bàn dành trọn cho các thẻ bài vừa xuất kích và thông báo hiệu ứng.
- **🔍 Hero Inspector (Bảng Chi Tiết Tướng Toàn Cảnh):**
  - **Khái niệm:** Bảng thông tin chi tiết kích hoạt khi chạm vào thẻ tướng trong màn chọn tướng (DraftScreen) hoặc trên bàn chơi. Hiển thị phóng to chân dung tướng cùng toàn bộ văn bản kỹ năng với phông chữ lớn, sắc nét, có độ tương phản cao, giải quyết triệt để lỗi không đọc được chữ nhỏ trên thẻ bài giấy.

---

## 14. TRÍ TUỆ NHÂN TẠO BOTAI & BẤT BIẾN TẦNG ỨNG DỤNG (BOTAI TACTICAL ENGINE & APPLICATION INVARIANTS)

- **🤖 Proactive Hero Reveal Policy (Chính Sách Chủ Động Hiển Lộ Tướng Của Bot):**
  - **Khái niệm:** Thuật toán đánh giá trạng thái đầu lượt của Bot trong `BotBrain._decideHeroReveal`. Bot chủ động hiển lộ tướng nếu vị tướng sở hữu kỹ năng kích hoạt chủ động trong pha hành động (`lan_sau`, `tu_chu`, `thinh_chinh`, `than_hoa`, `thuy_to`, `chuong_duong`, `linh_giam`, `duong_quan`, `trung_dung`) để mở khóa chuỗi combo chiến thuật thay vì ẩn mình thụ động.
- **🔄 Virtual Card Routing Precedence (Độ Ưu Tiên Định Tuyến Thẻ Bài Ảo):**
  - **Khái niệm:** Nguyên lý phân tách định tuyến trong `DispatcherV4._handlePlayCard`. Khi một lá bài được chuyển đổi bởi kỹ năng tướng (như `thinh_chinh` thành `Đào`, `than_hoa` thành `Hỏa Công`, `tien_duyen_chu_dong_tu` thành `Xiềng Xích`), thuộc tính `virtualCardName` được gán quyền ưu tiên cao hơn kiểu thẻ bài vật lý (`cardType`). Mọi lá bài chuyển đổi không phải Chém (`isConvertedNonSlash`) đều bị loại trừ khỏi luồng `CombatRules.playSlash`, ngăn chặn tuyệt đối lỗi tự chém vào bản thân khi hồi phục máu hoặc thiêu đốt.
- **🛡️ Locked Passive Target Immunity (Bất Biến Miễn Nhiễm Tỏa Định Kỹ):**
  - **Khái niệm:** Quy tắc bảo toàn tính miễn nhiễm của các kỹ năng Tỏa định (như `dam_bac` của Lang Liêu khi hết bài trên tay không thể bị Chém/Quyết đấu; `nghe_an_ke` của Nguyễn Chích không thể bị Cướp Bài/Hỗn Loạn). Quy tắc này được đồng bộ xuyên suốt từ `TargetResolverV4` đến `BotBrain` và `TrickRules`/`CombatRules`, đảm bảo Bot không bao giờ gửi đi payload hành động vi phạm điều kiện miễn nhiễm.
- **⏱️ Active Non-Card Reaction Resolver (Bộ Phản Hồi Ngăn Xếp Phi Thẻ Bài):**
  - **Khái niệm:** Cơ chế trong `BotRunnerV4` và `BotBrain` xử lý các khung ưu tiên phản hồi không yêu cầu tiêu hao thẻ bài vật lý (như `doJudge: true` của Phá Thành, `doUse: true` của Dưỡng Quân, `suit` của Tâm Công, `option` của Mượn Đao). Tránh việc hệ thống nhận diện nhầm các quyết định logic này là trạng thái hủy bỏ (`canceled: true`).




