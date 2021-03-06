import { Component, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { CallNumber } from '@ionic-native/call-number';
import { PlacesDataProvider } from '../../providers/places-data/places-data';
import { UserDataProvider } from '../../providers/user-data/user-data';
import { Place } from '../../interfaces/place';
import { DomSanitizer } from '@angular/platform-browser';
import { UtilsProvider } from '../../providers/utils/utils';
import { Chart } from 'chart.js';

@IonicPage()
@Component({
  selector: 'page-place-detail',
  templateUrl: 'place-detail.html',
})
export class PlaceDetailPage {

  @ViewChild('canvas') canvas: ElementRef;

  place: Place;
  imageUrl;
  imageDbUrl: string;

  constructor(private navCtrl: NavController, private navParams: NavParams,
    private alertCtrl: AlertController, private placesProvider: PlacesDataProvider,
    private callNumber: CallNumber, private userData: UserDataProvider,
    private placesData: PlacesDataProvider, private utils: UtilsProvider,
    private sanitizer: DomSanitizer) { }

  ionViewDidLoad() {
    this.getPlaceInfo(this.navParams.get('placeId'));
  }

  getPlaceInfo(placeId: string) {
    let loading = this.utils.showLoading('Cargando datos...');
    this.placesProvider.getPlaceDetails(placeId)
    .subscribe(data => {
      loading.dismiss();
      this.place = data.result;
      this.loadPlaceImage();
      this.generateRatingsChart();
    });
  }

  loadPlaceImage() {
    if (this.place.photos) {
      this.placesData.getPhoto(this.place.photos[0].photo_reference)
      .subscribe(data => {
        this.imageUrl = this.sanitize(URL.createObjectURL(data));
      });
      this.imageDbUrl = 'https://maps.googleapis.com/maps/api/place/photo?photoreference='
        + `${this.place.photos[0].photo_reference}`
        + '&maxheight=200'
        + '&key=AIzaSyDs1o9mW-vhqMcBocjTQkZdGi5I2EXmt5I';
    } else {
      this.imageUrl = 'http://vollrath.com/ClientCss/images/VollrathImages/No_Image_Available.jpg';
      this.imageDbUrl = this.imageUrl;
    }
  }

  // Create a line chart with user reviews
  generateRatingsChart() {
    let labels: string[] = [];
    let reviews: number[] = [];
    let count: number = 1;
    this.place.reviews.forEach(review => {
      labels.push(`u${count}`);
      reviews.push(review.rating);
      count++;
    });

    let config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: reviews,
          backgroundColor: [
            'rgba(0, 153, 255, 1)'
          ],
          borderColor: [
            'rgba(0, 153, 255, 1)'
          ],
          fill: false
        }]
      },
      options: {
        responsive: true,
        title: {
          display: true,
          text: 'Ratings de los usuarios'
        },
        legend: {
          display: false
        },
        scales: {
          xAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Usuarios'
            }
          }],
          yAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Ratings'
            },
            ticks: {
              beginAtZero:true
            }
          }]
        }
      }
    };

    new Chart(this.canvas.nativeElement, config);
  }

  onImageClicked() {
    this.navCtrl.push('PlacePhotosPage', {
      name: this.place.name,
      photoRefs: this.place.photos
    });
  }

  launchDialer(phone: string) {
    this.callNumber.callNumber(phone, true)
    .catch(() => this.utils.showAlert('Error al llamar', false));
  }

  onLinkClicked(url: string) {
    window.open(url, '_system');
  }

  savePlace(id: string, name: string, address: string) {
    let alert = this.alertCtrl.create();
    alert.setTitle('Lista');

    this.userData.getUserLists().subscribe(lists => {
      if (alert != null) {
        lists.forEach(list => {
          alert.addInput({
            type: 'radio',
            label: list['payload'].val().name,
            value: list['payload']['key']
          });
        });
        alert.present();
      }
    });
    
    alert.addButton('Cancel');
    alert.addButton({
      text: 'Ok',
      handler: data => {
        alert = null;
        // Ensure place is not on the list yet
        this.userData.checkIfPlaceBelongsToList(data, id)
        .then(belongs => {
          if (belongs) {
            this.utils.showToast('El lugar ya pertenece a la lista seleccionada');
          } else {
            this.userData.addPlaceToList(data, id, name, address, this.imageDbUrl)
            .then(() => {
              this.utils.showToast('Añadido correctamente');
            });
          }
        });
      }
    });
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}
