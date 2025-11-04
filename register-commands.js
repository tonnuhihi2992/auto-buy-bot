import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  // Người dùng
  new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Mua sản phẩm'),

  new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Xem tồn kho/key còn lại'),

  // Admin: danh mục
  new SlashCommandBuilder()
    .setName('admin_add_category')
    .setDescription('ADMIN: thêm danh mục')
    .addStringOption(o =>
      o.setName('name').setDescription('Tên danh mục (vd: Apple Cheat)').setRequired(true)
    )
    .addBooleanOption(o =>
      o.setName('active').setDescription('Kích hoạt').setRequired(true)
    ),

  // Admin: sản phẩm (!!! tất cả required trước, optional sau)
  new SlashCommandBuilder()
    .setName('admin_add_product')
    .setDescription('ADMIN: thêm sản phẩm')
    .addStringOption(o =>
      o.setName('name').setDescription('Tên SP').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('price').setDescription('Giá (VND)').setRequired(true)
    )
    .addBooleanOption(o =>
      o.setName('active').setDescription('Kích hoạt').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('category_id').setDescription('ID danh mục (tùy chọn, để lọc ở /buy)').setRequired(false)
    ),

  // Admin: nạp key
  new SlashCommandBuilder()
    .setName('admin_load_keys')
    .setDescription('ADMIN: nạp key (mỗi dòng 1 key)')
    .addIntegerOption(o =>
      o.setName('product_id').setDescription('ID SP').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('keys_text').setDescription('Danh sách key (mỗi dòng 1 key)').setRequired(true)
    ),

  // Admin: xác nhận đơn
  new SlashCommandBuilder()
    .setName('xacnhan')
    .setDescription('ADMIN: xác nhận đơn đã thanh toán (nếu chưa gắn webhook)')
    .addStringOption(o =>
      o.setName('order_id').setDescription('Mã đơn ORD_*').setRequired(true)
    ),

  // Admin: xóa sản phẩm
  new SlashCommandBuilder()
    .setName('admin_delete_product')
    .setDescription('ADMIN: xóa sản phẩm (và tất cả keys)')
    .addIntegerOption(o =>
      o.setName('product_id').setDescription('ID sản phẩm cần xóa').setRequired(true)
    ),

  // Admin: xóa danh mục
  new SlashCommandBuilder()
    .setName('admin_delete_category')
    .setDescription('ADMIN: xóa danh mục')
    .addIntegerOption(o =>
      o.setName('category_id').setDescription('ID danh mục cần xóa').setRequired(true)
    ),

  // Admin: xóa keys
  new SlashCommandBuilder()
    .setName('admin_delete_keys')
    .setDescription('ADMIN: xóa keys của sản phẩm')
    .addIntegerOption(o =>
      o.setName('product_id').setDescription('ID sản phẩm').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('type').setDescription('Loại keys cần xóa').setRequired(true)
        .addChoices(
          { name: 'Tất cả keys', value: 'all' },
          { name: 'Chỉ keys đã bán', value: 'sold' },
          { name: 'Chỉ keys chưa bán', value: 'unsold' }
        )
    ),

  // Admin: sửa key
  new SlashCommandBuilder()
    .setName('admin_edit_key')
    .setDescription('ADMIN: sửa một key (tìm theo key ID)'),

  // Admin: thay thế key
  new SlashCommandBuilder()
    .setName('admin_replace_key')
    .setDescription('ADMIN: thay thế key cũ bằng key mới'),
  
  // Admin: set discount
  new SlashCommandBuilder()
    .setName('admin_set_discount')
    .setDescription('ADMIN: đặt giảm giá cho sản phẩm')
    .addIntegerOption(o =>
      o.setName('product_id').setDescription('ID sản phẩm').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('discount').setDescription('% giảm giá (0-100)').setRequired(true)
    ),
  
  // Admin: create coupon
  new SlashCommandBuilder()
    .setName('admin_create_coupon')
    .setDescription('ADMIN: tạo mã giảm giá')
    .addStringOption(o =>
      o.setName('code').setDescription('Mã giảm giá (VD: SALE20)').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('discount').setDescription('% giảm giá (1-100)').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('max_uses').setDescription('Số lần dùng tối đa (-1 = không giới hạn)').setRequired(false)
    ),
  
  // Admin: clear messages
  new SlashCommandBuilder()
    .setName('admin_clear')
    .setDescription('ADMIN: xóa tin nhắn trong channel')
    .addIntegerOption(o =>
      o.setName('amount').setDescription('Số tin nhắn cần xóa (1-100)').setRequired(true)
    ),

  // Admin: xác nhận thanh toán thủ công
  new SlashCommandBuilder()
    .setName('admin_confirm')
    .setDescription('ADMIN: xác nhận thanh toán thủ công')
    .addStringOption(o =>
      o.setName('order_id').setDescription('Mã đơn hàng (VD: ORD_1730000000000_12345)').setRequired(true)
    ),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('✅ Đã đăng ký lệnh (guild).');
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Đã đăng ký lệnh (global).');
    }
  } catch (e) {
    console.error('❌ Lỗi đăng ký lệnh:', e);
  }
})();
