const Banner = require('../models/Banner');

// Get all banners (admin)
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ priority: -1 });
    res.json(banners);
  } catch (error) {
    console.error('Error in getBanners:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active banners (public)
exports.getActiveBanners = async (req, res) => {
  try {
    const now = new Date();

    const banners = await Banner.find({
      isActive: true,
      $or: [
        { startDate: null },
        { startDate: { $lte: now } }
      ],
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    }).sort({ priority: -1 });

    res.json(banners);
  } catch (error) {
    console.error('Error in getActiveBanners:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create banner (admin)
exports.createBanner = async (req, res) => {
  try {
    const { title, subtitle, description, image, link, position, startDate, endDate, priority } = req.body;

    const banner = new Banner({
      title,
      subtitle,
      description,
      image,
      link,
      position,
      startDate,
      endDate,
      priority
    });

    await banner.save();
    res.status(201).json(banner);
  } catch (error) {
    console.error('Error in createBanner:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update banner (admin)
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const banner = await Banner.findByIdAndUpdate(id, updates, { new: true });

    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    res.json(banner);
  } catch (error) {
    console.error('Error in updateBanner:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete banner (admin)
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error in deleteBanner:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
