const formatTime = (prevTime) => {
    const now = new Date();
    const timeDifference = now - prevTime;
    const seconds = Math.floor((timeDifference / 1000) % 60);
    const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
    const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    return ({
        days: days || 0, hours: hours || 0, minutes: minutes || 0, seconds: seconds || 0
    })
}

const formatDuration = duration => {
    const hours = Math.floor(duration / 3600);
    duration -= hours * 3600
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return ({
        hours: hours || 0, minutes: minutes || 0, seconds: seconds || 0
    })
}

const fileSize = size => Math.floor(size / (1024 * 1024));